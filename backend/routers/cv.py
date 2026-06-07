import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from models import UploadResponse
from services.db import get_db, get_settings
from services.parser import parse_cv
from services.rate_limit import limiter

router = APIRouter()
MAX_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".docx"}


@router.post("/upload-cv", response_model=UploadResponse)
@limiter.limit(lambda: f"{get_settings().rate_limit_per_day}/day")
async def upload_cv(request: Request, file: UploadFile = File(...)) -> UploadResponse:
    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files can survive this roast.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="That CV is over 5MB. The ego may be bigger, but the file cannot be.")

    try:
        text, sections = parse_cv(file.filename or "cv", content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    session_id = str(uuid.uuid4())
    await get_db().roasts.insert_one(
        {
            "session_id": session_id,
            "cv_text": text,
            "sections": sections,
            "created_at": datetime.now(timezone.utc),
            "upvotes": 0,
            "is_public": False,
        }
    )
    return UploadResponse(session_id=session_id, sections=sections)
