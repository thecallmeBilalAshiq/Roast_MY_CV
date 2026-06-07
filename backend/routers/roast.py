from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from models import RoastRequest
from services.ai import generate_roast, stream_words
from services.db import get_db, get_settings
from services.rate_limit import limiter

router = APIRouter()


@router.post("/roast")
@limiter.limit(lambda: f"{get_settings().rate_limit_per_day}/day")
async def roast_cv(request: Request, payload: RoastRequest) -> StreamingResponse:
    existing = await get_db().roasts.find_one({"session_id": payload.session_id})
    if not existing:
        raise HTTPException(status_code=404, detail="We looked everywhere. This CV has already fled the scene.")

    result = await generate_roast(existing["cv_text"], existing.get("sections", {}), payload.intensity)
    result.update(
        {
            "session_id": payload.session_id,
            "sections": existing.get("sections", {}),
            "intensity": payload.intensity.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "upvotes": existing.get("upvotes", 0),
            "is_public": existing.get("is_public", False),
        }
    )

    await get_db().roasts.update_one(
        {"session_id": payload.session_id},
        {
            "$set": {
                "roast": result["roast"],
                "scores": result["scores"],
                "serious_feedback": result["serious_feedback"],
                "section_feedback": result.get("section_feedback", {}),
                "verdict": result["verdict"],
                "intensity": payload.intensity.value,
                "created_at": datetime.now(timezone.utc),
            }
        },
    )

    async def events():
        async for event in stream_words(result):
            yield f"data: {event}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream")


@router.get("/roast/{session_id}")
async def get_roast(session_id: str):
    roast = await get_db().roasts.find_one({"session_id": session_id}, {"_id": 0, "cv_text": 0})
    if not roast or "roast" not in roast:
        raise HTTPException(status_code=404, detail="No roast found. Either it is hiding, or it was never cooked.")
    return roast
