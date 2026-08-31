"""
jd_match.py — JD-to-resume matching endpoints.

Compares the authenticated user's latest resume against a job description,
persists the match result, and provides match history.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional

from app.core.auth import get_current_user, AuthUser
from app.core.supabase_client import get_supabase
from app.core.rate_limiter import ai_limit
from app.services.jd_matcher import compare_resume_with_jd
import logging

log = logging.getLogger(__name__)

router = APIRouter(prefix="/jd", tags=["JD Matcher"])


class JDMatchRequest(BaseModel):
    jd_text: str = Field(..., max_length=20000)
    jd_title: Optional[str] = None
    jd_company: Optional[str] = None


@router.post("/match")
@ai_limit
async def match_jd(
    request: Request,
    body: JDMatchRequest,
    user: AuthUser = Depends(get_current_user),
):
    """
    Compare the user's latest resume against a job description.
    Returns match score, matched/missing skills, and strength assessment.
    Persists the result to the jd_matches table.
    """
    if not body.jd_text or len(body.jd_text.strip()) < 20:
        raise HTTPException(
            status_code=400,
            detail="jd_text must be at least 20 characters.",
        )

    try:
        sb = get_supabase()

        # ── Fetch user's latest resume ─────────────────────────────────
        resume_resp = (
            sb.table("resumes")
            .select("id, detected_skills")
            .eq("user_email", user.email)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        if not resume_resp.data:
            raise HTTPException(
                status_code=404,
                detail="No resume found. Please upload a resume first.",
            )

        resume = resume_resp.data[0]
        detected_skills = resume.get("detected_skills") or []

        # ── Run JD matcher ─────────────────────────────────────────────
        result = compare_resume_with_jd(
            {"skills": detected_skills},
            body.jd_text,
        )

        # ── Persist match ──────────────────────────────────────────────
        match_data = {
            "user_email": user.email,
            "resume_id": resume["id"],
            "jd_text": body.jd_text[:5000],
            "jd_title": body.jd_title,
            "jd_company": body.jd_company,
            "match_score": result["jd_match_score"],
            "matched_skills": result["matched_skills"],
            "missing_skills": result["missing_skills"],
            "high_priority": result["high_priority_missing"],
            "match_strength": result["match_strength"],
        }

        insert_resp = sb.table("jd_matches").insert(match_data).execute()
        result["match_id"] = insert_resp.data[0]["id"] if insert_resp.data else None

        return result

    except HTTPException:
        raise
    except EnvironmentError:
        raise HTTPException(status_code=503, detail="Database not configured.")
    except Exception:
        log.exception("JD match failed")
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


@router.get("/history")
async def jd_match_history(
    user: AuthUser = Depends(get_current_user),
):
    """
    Return the last 20 JD match results for the authenticated user,
    ordered by most recent first.
    """
    try:
        sb = get_supabase()

        resp = (
            sb.table("jd_matches")
            .select("id, jd_title, jd_company, match_score, match_strength, matched_skills, missing_skills, created_at")
            .eq("user_email", user.email)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )

        return resp.data or []

    except EnvironmentError:
        raise HTTPException(status_code=503, detail="Database not configured.")
    except Exception:
        log.exception("JD history fetch failed")
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")
