from fastapi import APIRouter, HTTPException, Query

from models import PublicSubmitResponse, UpvoteResponse
from services.db import get_db

router = APIRouter()


@router.get("/hall-of-shame")
async def hall_of_shame(
    sort: str = Query("recent", pattern="^(recent|lowest|upvoted)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
):
    sort_map = {
        "recent": [("created_at", -1)],
        "lowest": [("scores.overall", 1), ("created_at", -1)],
        "upvoted": [("upvotes", -1), ("created_at", -1)],
    }
    cursor = (
        get_db()
        .roasts.find({"is_public": True, "roast": {"$exists": True}}, {"_id": 0, "cv_text": 0, "sections": 0})
        .sort(sort_map[sort])
        .skip((page - 1) * limit)
        .limit(limit)
    )
    items = await cursor.to_list(length=limit)
    return {"items": items, "page": page, "limit": limit}


@router.post("/hall-of-shame/{session_id}/submit", response_model=PublicSubmitResponse)
async def submit_to_hall(session_id: str) -> PublicSubmitResponse:
    result = await get_db().roasts.update_one(
        {"session_id": session_id, "roast": {"$exists": True}},
        {"$set": {"is_public": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="No finished roast to submit. The wall demands evidence.")
    return PublicSubmitResponse(session_id=session_id, is_public=True)


@router.post("/hall-of-shame/{session_id}/upvote", response_model=UpvoteResponse)
async def upvote(session_id: str) -> UpvoteResponse:
    result = await get_db().roasts.find_one_and_update(
        {"session_id": session_id, "is_public": True},
        {"$inc": {"upvotes": 1}},
        projection={"_id": 0, "session_id": 1, "upvotes": 1},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="This roast is not on the public wall.")
    return UpvoteResponse(session_id=session_id, upvotes=result["upvotes"])
