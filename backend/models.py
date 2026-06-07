from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class Intensity(str, Enum):
    mild = "mild"
    medium = "medium"
    brutal = "brutal"


class UploadResponse(BaseModel):
    session_id: str
    sections: Dict[str, str]


class RoastRequest(BaseModel):
    session_id: str
    intensity: Intensity = Intensity.medium


class Scores(BaseModel):
    skills: int = Field(ge=1, le=10)
    experience: int = Field(ge=1, le=10)
    formatting: int = Field(ge=1, le=10)
    impact: int = Field(ge=1, le=10)
    overall: int = Field(ge=1, le=10)


class RoastResult(BaseModel):
    session_id: str
    roast: str
    scores: Scores
    serious_feedback: List[str]
    verdict: str
    sections: Dict[str, str] = Field(default_factory=dict)
    section_feedback: Dict[str, List[str]] = Field(default_factory=dict)
    intensity: Intensity
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    upvotes: int = 0
    is_public: bool = False


class HallItem(BaseModel):
    session_id: str
    verdict: str
    overall: int
    intensity: Intensity
    upvotes: int
    created_at: datetime


class PublicSubmitResponse(BaseModel):
    session_id: str
    is_public: bool


class UpvoteResponse(BaseModel):
    session_id: str
    upvotes: int
