import os
import json
import asyncio
from functools import lru_cache
from pathlib import Path
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    mongodb_uri: str = "mongodb://mongo:27017/roast_my_cv"
    frontend_url: str = "http://localhost:3000"
    rate_limit_per_day: int = 3

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings(
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
        mongodb_uri=os.getenv("MONGODB_URI", "mongodb://mongo:27017/roast_my_cv"),
        frontend_url=os.getenv("FRONTEND_URL", "http://localhost:3000"),
        rate_limit_per_day=int(os.getenv("RATE_LIMIT_PER_DAY", "3")),
    )


client: AsyncIOMotorClient | None = None
fallback_db: "LocalJsonDatabase | None" = None


async def connect_db() -> None:
    global client, fallback_db
    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=1500)
    try:
        await client.admin.command("ping")
        db = get_db()
        await db.roasts.create_index("session_id", unique=True)
        await db.roasts.create_index([("is_public", 1), ("created_at", -1)])
    except Exception:
        client.close()
        client = None
        fallback_db = LocalJsonDatabase(Path(__file__).resolve().parents[1] / "data" / "roasts.json")


async def close_db() -> None:
    if client:
        client.close()


def get_db() -> AsyncIOMotorDatabase | "LocalJsonDatabase":
    if fallback_db is not None:
        return fallback_db
    if client is None:
        raise RuntimeError("Database client is not initialized")
    return client.get_default_database()


class UpdateResult:
    def __init__(self, matched_count: int):
        self.matched_count = matched_count


class LocalCursor:
    def __init__(self, items: list[dict[str, Any]]):
        self.items = items
        self.skip_count = 0
        self.limit_count: int | None = None

    def sort(self, sort_spec: list[tuple[str, int]]):
        for key, direction in reversed(sort_spec):
            self.items.sort(key=lambda item: get_nested(item, key) or 0, reverse=direction < 0)
        return self

    def skip(self, count: int):
        self.skip_count = count
        return self

    def limit(self, count: int):
        self.limit_count = count
        return self

    async def to_list(self, length: int | None = None):
        limit = self.limit_count or length
        end = None if limit is None else self.skip_count + limit
        return self.items[self.skip_count : end]


class LocalJsonCollection:
    def __init__(self, path: Path):
        self.path = path
        self.lock = asyncio.Lock()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.write_text("[]", encoding="utf-8")

    async def create_index(self, *_args, **_kwargs):
        return None

    async def insert_one(self, document: dict[str, Any]):
        async with self.lock:
            items = self._read()
            items.append(json_safe(document))
            self._write(items)

    async def find_one(self, query: dict[str, Any], projection: dict[str, int] | None = None):
        async with self.lock:
            for item in self._read():
                if matches(item, query):
                    return apply_projection(item, projection)
        return None

    async def update_one(self, query: dict[str, Any], update: dict[str, Any]):
        async with self.lock:
            items = self._read()
            matched = 0
            for item in items:
                if matches(item, query):
                    matched = 1
                    apply_update(item, update)
                    break
            self._write(items)
            return UpdateResult(matched)

    def find(self, query: dict[str, Any], projection: dict[str, int] | None = None):
        items = [apply_projection(item, projection) for item in self._read() if matches(item, query)]
        return LocalCursor(items)

    async def find_one_and_update(
        self,
        query: dict[str, Any],
        update: dict[str, Any],
        projection: dict[str, int] | None = None,
        **_kwargs,
    ):
        async with self.lock:
            items = self._read()
            for item in items:
                if matches(item, query):
                    apply_update(item, update)
                    self._write(items)
                    return apply_projection(item, projection)
        return None

    def _read(self) -> list[dict[str, Any]]:
        return json.loads(self.path.read_text(encoding="utf-8"))

    def _write(self, items: list[dict[str, Any]]) -> None:
        self.path.write_text(json.dumps(items, indent=2), encoding="utf-8")


class LocalJsonDatabase:
    def __init__(self, path: Path):
        self.roasts = LocalJsonCollection(path)


def get_nested(item: dict[str, Any], key: str):
    value: Any = item
    for part in key.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def set_nested(item: dict[str, Any], key: str, value: Any) -> None:
    target = item
    parts = key.split(".")
    for part in parts[:-1]:
        target = target.setdefault(part, {})
    target[parts[-1]] = value


def matches(item: dict[str, Any], query: dict[str, Any]) -> bool:
    for key, expected in query.items():
        actual = get_nested(item, key)
        if isinstance(expected, dict) and "$exists" in expected:
            exists = actual is not None
            if exists != expected["$exists"]:
                return False
        elif actual != expected:
            return False
    return True


def apply_update(item: dict[str, Any], update: dict[str, Any]) -> None:
    for key, value in update.get("$set", {}).items():
        set_nested(item, key, json_safe(value))
    for key, value in update.get("$inc", {}).items():
        set_nested(item, key, (get_nested(item, key) or 0) + value)


def apply_projection(item: dict[str, Any], projection: dict[str, int] | None):
    cloned = json.loads(json.dumps(item))
    if not projection:
        return cloned
    for key, include in projection.items():
        if include == 0:
            remove_nested(cloned, key)
    return cloned


def remove_nested(item: dict[str, Any], key: str) -> None:
    target = item
    parts = key.split(".")
    for part in parts[:-1]:
        target = target.get(part, {})
    if isinstance(target, dict):
        target.pop(parts[-1], None)


def json_safe(value: Any) -> Any:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: json_safe(inner) for key, inner in value.items()}
    if isinstance(value, list):
        return [json_safe(inner) for inner in value]
    return value
