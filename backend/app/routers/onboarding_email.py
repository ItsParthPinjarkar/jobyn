"""
Onboarding email drip endpoints.
POST /onboarding/trigger  — called after signup, creates progress record + sends welcome email
POST /onboarding/check    — called on login, sends any pending drip emails
"""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.core.supabase_client import get_supabase
from app.core.auth import get_current_user, AuthUser
from app.services import email as email_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


class TriggerRequest(BaseModel):
    email: str
    name: str | None = None
    goal: str | None = None


class CheckRequest(BaseModel):
    email: str


def _now():
    return datetime.now(timezone.utc)


def _sb():
    try:
        return get_supabase()
    except Exception:
        return None


# ── POST /onboarding/trigger ─────────────────────────────────────────

@router.post("/trigger")
async def trigger_onboarding(req: TriggerRequest, user: AuthUser = Depends(get_current_user)):
    """
    Called immediately after signup.
    Creates an onboarding_progress row and sends the welcome email.
    """
    sb = _sb()
    if not sb:
        return {"status": "skipped", "reason": "no database"}

    # Upsert progress record
    try:
        sb.table("onboarding_progress").upsert({
            "user_id": user.sub,  # authenticated Supabase user UUID (was hardcoded "anonymous")
            "email": user.email,
            "goal": req.goal,
            "email_welcome_sent": False,
        }, on_conflict="user_id").execute()
    except Exception as e:
        logger.warning(f"onboarding_progress upsert failed: {e}")

    # Send welcome email
    sent = False
    if email_service.is_configured():
        name = req.name or user.email.split("@")[0].title()
        html = email_service.email_welcome(name)
        sent = email_service.send_email(user.email, "Your career readiness journey starts now", html)

        # Mark as sent
        if sent:
            try:
                sb.table("onboarding_progress").update({
                    "email_welcome_sent": True,
                }).eq("email", user.email).execute()
            except Exception as e:
                logger.warning(f"Failed to mark welcome email sent: {e}")

    return {"status": "sent" if sent else "skipped", "email": user.email}


# ── POST /onboarding/check ───────────────────────────────────────────

@router.post("/check")
async def check_onboarding_emails(req: CheckRequest, user: AuthUser = Depends(get_current_user)):
    """
    Called on login. Checks if any pending drip emails should be sent.
    Returns which emails were sent (if any).
    """
    sb = _sb()
    if not sb:
        return {"sent": [], "reason": "no database"}

    if not email_service.is_configured():
        return {"sent": [], "reason": "email not configured"}

    # Fetch progress record
    try:
        resp = sb.table("onboarding_progress").select("*").eq("email", user.email).execute()
        if not resp.data:
            return {"sent": [], "reason": "no progress record"}
        progress = resp.data[0]
    except Exception as e:
        logger.warning(f"Failed to fetch onboarding progress: {e}")
        return {"sent": [], "reason": "db error"}

    sent_emails = []
    now = _now()
    created = datetime.fromisoformat(progress["created_at"].replace("Z", "+00:00")) if progress.get("created_at") else now
    age_days = (now - created).days

    updates = {}

    # Day 1: No resume upload
    if age_days >= 1 and not progress.get("email_day1_sent") and not progress.get("resume_uploaded_at"):
        html = email_service.email_day1_no_upload()
        if email_service.send_email(user.email, "Your resume is waiting", html):
            updates["email_day1_sent"] = True
            sent_emails.append("day1_no_upload")

    # Day 3: No skill exploration (after upload)
    if age_days >= 3 and not progress.get("email_day3_sent") and progress.get("resume_uploaded_at") and not progress.get("skill_explored_at"):
        # Try to get score from analysis
        score = 50
        top_gap = "your skills"
        try:
            # Fetch latest analysis
            pass
            # We don't have the raw text here, so use defaults
        except Exception:
            pass
        html = email_service.email_day3_no_explore(score, top_gap)
        if email_service.send_email(user.email, "Your top skill gaps are ready", html):
            updates["email_day3_sent"] = True
            sent_emails.append("day3_no_explore")

    # Day 5: No interview practice
    if age_days >= 5 and not progress.get("email_day5_sent") and not progress.get("interview_practiced_at"):
        html = email_service.email_day5_no_interview()
        if email_service.send_email(user.email, "Ready for a mock interview?", html):
            updates["email_day5_sent"] = True
            sent_emails.append("day5_no_interview")

    # Day 7: Weekly summary
    if age_days >= 7 and not progress.get("email_day7_sent"):
        name = user.email.split("@")[0].title()
        html = email_service.email_day7_summary(
            score=progress.get("score", 50),
            skills_detected=progress.get("skills_detected", 0),
            name=name,
        )
        if email_service.send_email(user.email, "Your first week on Jobyn", html):
            updates["email_day7_sent"] = True
            sent_emails.append("day7_summary")

    # Batch update
    if updates:
        try:
            sb.table("onboarding_progress").update(updates).eq("email", user.email).execute()
        except Exception as e:
            logger.warning(f"Failed to update onboarding progress: {e}")

    return {"sent": sent_emails}


# ── POST /onboarding/milestone ───────────────────────────────────────

class MilestoneRequest(BaseModel):
    email: str
    milestone: str  # resume_uploaded, skill_explored, interview_practiced


@router.post("/milestone")
async def record_milestone(req: MilestoneRequest, user: AuthUser = Depends(get_current_user)):
    """
    Called when a user hits an onboarding milestone.
    Updates the progress record so drip emails skip completed steps.
    """
    sb = _sb()
    if not sb:
        return {"status": "skipped"}

    column_map = {
        "resume_uploaded": "resume_uploaded_at",
        "skill_explored": "skill_explored_at",
        "interview_practiced": "interview_practiced_at",
    }
    column = column_map.get(req.milestone)
    if not column:
        raise HTTPException(400, f"Unknown milestone: {req.milestone}")

    try:
        sb.table("onboarding_progress").update({
            column: _now().isoformat(),
        }).eq("email", user.email).execute()
    except Exception as e:
        logger.warning(f"Failed to record milestone: {e}")

    return {"status": "ok", "milestone": req.milestone}
