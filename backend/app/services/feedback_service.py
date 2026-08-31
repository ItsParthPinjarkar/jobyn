"""
feedback_service.py — Collect user corrections on predictions.

Stores feedback in Supabase ``prediction_feedback`` table and exposes
aggregation helpers so future training runs can incorporate corrections.
"""

from __future__ import annotations

import logging

from app.core.supabase_client import get_supabase

logger = logging.getLogger(__name__)


# ── Submit feedback ────────────────────────────────────────────────────────────

def submit_feedback(
    *,
    predicted_role: str,
    correct_role: str | None = None,
    score_feedback: str | None = None,
    comment: str | None = None,
    analysis_id: int | None = None,
    user_email: str | None = None,
) -> dict:
    """
    Persist a single feedback record.

    Parameters
    ----------
    predicted_role : str
        The role the model predicted.
    correct_role : str | None
        The role the user believes is correct. ``None`` means the prediction
        was accepted as-is.
    score_feedback : str | None
        One of ``"too_high"``, ``"too_low"``, ``"accurate"``, or ``None``.
    comment : str | None
        Free-text note from the user.
    analysis_id : int | None
        Foreign key to ``role_analyses.id`` if available.
    user_email : str | None
        Identifies the user who submitted the correction.
    """
    row = {
        "predicted_role": predicted_role,
        "correct_role": correct_role,
        "score_feedback": score_feedback,
        "comment": comment,
        "analysis_id": analysis_id,
        "user_email": user_email,
    }
    # Remove None values — let Supabase use column defaults
    row = {k: v for k, v in row.items() if v is not None}

    sb = get_supabase()
    result = sb.table("prediction_feedback").insert(row).execute()

    if result.data:
        logger.info("Feedback #%s recorded", result.data[0].get("id"))
        return result.data[0]

    logger.warning("Feedback insert returned no data")
    return row


# ── Aggregation helpers ────────────────────────────────────────────────────────

def get_feedback_summary(page: int = 1, per_page: int = 50) -> dict:
    """
    Return aggregated feedback stats:
      - total count
      - count of corrections (predicted ≠ correct)
      - score_feedback distribution

    Paginated: page/per_page control the underlying query size.
    """
    sb = get_supabase()
    offset = (page - 1) * per_page

    result = sb.table("prediction_feedback").select("*", count="exact").range(offset, offset + per_page - 1).execute()
    rows = result.data or []
    total = result.count or len(rows)

    corrections = sum(1 for r in rows if r.get("correct_role"))
    confirmations = total - corrections

    score_dist: dict[str, int] = {"too_high": 0, "too_low": 0, "accurate": 0}
    for r in rows:
        sf = r.get("score_feedback")
        if sf in score_dist:
            score_dist[sf] += 1

    return {
        "total_feedback": total,
        "corrections": corrections,
        "confirmations": confirmations,
        "score_distribution": score_dist,
        "page": page,
        "per_page": per_page,
    }


def get_correction_pairs(page: int = 1, per_page: int = 50) -> dict:
    """
    Return feedback rows where the user provided a different correct_role.

    Useful for retraining: each row is a labelled sample the model got wrong.
    Returns paginated results with total count.
    """
    sb = get_supabase()
    offset = (page - 1) * per_page

    result = (
        sb.table("prediction_feedback")
        .select("predicted_role, correct_role, analysis_id, user_email, created_at", count="exact")
        .not_.is_("correct_role", "null")
        .range(offset, offset + per_page - 1)
        .execute()
    )
    return {
        "corrections": result.data or [],
        "total": result.count or 0,
        "page": page,
        "per_page": per_page,
    }
