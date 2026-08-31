"""
content_feedback.py — API endpoints for study content feedback.

POST /content-feedback          → submit content quality feedback
GET  /content-feedback/summary  → aggregated feedback stats
GET  /content-feedback/low-rated → content candidates for regeneration
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field

from app.core.auth import get_current_user, get_admin_user, AuthUser
from app.services.content_feedback_service import (
    submit_content_feedback,
    get_content_feedback_summary,
    get_low_rated_content,
)

router = APIRouter(prefix="/content-feedback", tags=["Content Feedback"])


class ContentFeedbackRequest(BaseModel):
    skill: str
    section_idx: int | None = None
    feedback_type: str = Field(
        ..., pattern="^(rating|error_report|suggestion|quality_issue)$"
    )
    rating: int | None = Field(None, ge=1, le=5)
    comment: str | None = None
    content_type: str = Field(
        "section", pattern="^(section|overview|quiz)$"
    )
    user_email: str | None = None


@router.post("")
def post_content_feedback(body: ContentFeedbackRequest, current_user: AuthUser = Depends(get_current_user)):
    """Submit feedback on study content quality."""
    try:
        record = submit_content_feedback(
            skill=body.skill,
            section_idx=body.section_idx,
            feedback_type=body.feedback_type,
            rating=body.rating,
            comment=body.comment,
            content_type=body.content_type,
            user_email=current_user.email,
        )
        return {"status": "recorded", "feedback": record}
    except Exception:
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.get("/summary")
def content_feedback_summary(
    skill: str | None = Query(None),
    _: AuthUser = Depends(get_admin_user),
):
    """Return aggregated content feedback statistics."""
    try:
        return get_content_feedback_summary(skill=skill)
    except Exception:
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.get("/low-rated")
def low_rated_content(
    threshold: float = Query(3.0),
    _: AuthUser = Depends(get_admin_user),
):
    """Find content with average rating below threshold — candidates for regeneration."""
    try:
        return {"low_rated": get_low_rated_content(threshold=threshold)}
    except Exception:
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")
