"""
proficiency_store.py — persist verified skill proficiency (Phase 2).

Stores the outcome of the opt-in verification quiz so a user's confirmed skills
survive across sessions and boost future analyses.

Graceful by design: if the `skill_proficiency` table hasn't been created yet
(the project applies schema changes manually), reads return {} and writes are
no-ops with a warning — verification still works in-session, it just doesn't
persist until the table exists.
"""

from __future__ import annotations
import logging

from app.core.supabase_client import get_supabase

log = logging.getLogger(__name__)
_TABLE = "skill_proficiency"


def load_verified(user_email: str | None) -> dict[str, dict]:
    """Return {skill: {"level", "confidence", "verified": True}} for a user's
    confirmed skills. Empty dict if none / table missing / not configured."""
    if not user_email:
        return {}
    try:
        sb = get_supabase()
        resp = (
            sb.table(_TABLE)
            .select("skill, level, confidence, verified")
            .eq("user_email", user_email)
            .eq("verified", True)
            .execute()
        )
        return {
            r["skill"]: {
                "level": r.get("level", "proficient"),
                "confidence": float(r.get("confidence", 1.0)),
                "verified": True,
            }
            for r in (resp.data or [])
        }
    except Exception as e:  # table missing / Supabase down — degrade silently
        log.warning("skill_proficiency load skipped: %s", e)
        return {}


def save_verified(user_email: str | None, skills: list[str], source: str = "quiz") -> bool:
    """Upsert the given skills as verified (confidence 1.0) for a user.
    Returns True on success, False if it couldn't persist (non-fatal)."""
    if not user_email or not skills:
        return False
    try:
        sb = get_supabase()
        rows = [
            {
                "user_email": user_email,
                "skill": s,
                "level": "proficient",
                "confidence": 1.0,
                "source": source,
                "verified": True,
            }
            for s in skills
        ]
        sb.table(_TABLE).upsert(rows, on_conflict="user_email,skill").execute()
        return True
    except Exception as e:  # most likely the table doesn't exist yet
        log.warning("skill_proficiency save skipped (table missing?): %s", e)
        return False
