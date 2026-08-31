"""
content_feedback_service.py — User feedback on study content quality.

Stores feedback in Supabase ``content_feedback`` table for iterative content improvement.
Tracks: section-level ratings, error reports, improvement suggestions.
"""

from __future__ import annotations

import logging

from app.core.supabase_client import get_supabase

log = logging.getLogger("content_feedback_service")


def submit_content_feedback(
    *,
    skill: str,
    section_idx: int | None = None,
    feedback_type: str,
    rating: int | None = None,
    comment: str | None = None,
    content_type: str = "section",
    user_email: str | None = None,
) -> dict:
    """
    Submit feedback on study content quality.

    Parameters
    ----------
    skill : str
        The skill name (e.g. "python", "react").
    section_idx : int | None
        Section index (None for overview-level feedback).
    feedback_type : str
        One of: "rating", "error_report", "suggestion", "quality_issue".
    rating : int | None
        1-5 star rating (only for feedback_type="rating").
    comment : str | None
        Free-text feedback or error description.
    content_type : str
        One of: "section", "overview", "quiz".
    user_email : str | None
        Identifies the user.
    """
    row = {
        "skill": skill.lower(),
        "section_idx": section_idx,
        "feedback_type": feedback_type,
        "rating": rating,
        "comment": comment,
        "content_type": content_type,
        "user_email": user_email,
    }
    row = {k: v for k, v in row.items() if v is not None}

    sb = get_supabase()
    result = sb.table("content_feedback").insert(row).execute()

    if result.data:
        log.info("Content feedback #%s recorded for %s/%s", result.data[0].get("id"), skill, section_idx)
        return result.data[0]

    log.warning("Content feedback insert returned no data")
    return row


def get_content_feedback_summary(skill: str | None = None) -> dict:
    """Return aggregated content feedback stats."""
    sb = get_supabase()
    query = sb.table("content_feedback").select("*")
    if skill:
        query = query.eq("skill", skill.lower())
    result = query.execute()
    rows = result.data or []

    total = len(rows)
    ratings = [r["rating"] for r in rows if r.get("rating")]
    avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else None

    type_dist = {}
    for r in rows:
        ft = r.get("feedback_type", "unknown")
        type_dist[ft] = type_dist.get(ft, 0) + 1

    error_reports = [r for r in rows if r.get("feedback_type") == "error_report"]
    suggestions = [r for r in rows if r.get("feedback_type") == "suggestion"]

    return {
        "total_feedback": total,
        "average_rating": avg_rating,
        "rating_count": len(ratings),
        "type_distribution": type_dist,
        "error_reports": len(error_reports),
        "suggestions": len(suggestions),
        "recent_errors": [
            {"skill": r["skill"], "section_idx": r.get("section_idx"), "comment": r.get("comment", "")[:200]}
            for r in error_reports[-10:]
        ],
        "recent_suggestions": [
            {"skill": r["skill"], "section_idx": r.get("section_idx"), "comment": r.get("comment", "")[:200]}
            for r in suggestions[-10:]
        ],
    }


def get_low_rated_content(threshold: float = 3.0) -> list[dict]:
    """Find content with average rating below threshold — candidates for regeneration."""
    sb = get_supabase()
    result = sb.table("content_feedback").select("*").eq("feedback_type", "rating").execute()
    rows = result.data or []

    # Group by skill + section
    groups: dict[str, list[int]] = {}
    for r in rows:
        key = f"{r['skill']}_{r.get('section_idx', 'overview')}"
        if key not in groups:
            groups[key] = []
        groups[key].append(r["rating"])

    low_rated = []
    for key, ratings in groups.items():
        avg = sum(ratings) / len(ratings)
        if avg < threshold and len(ratings) >= 2:
            skill, section = key.rsplit("_", 1)
            low_rated.append({
                "skill": skill,
                "section_idx": int(section) if section != "overview" else None,
                "average_rating": round(avg, 2),
                "rating_count": len(ratings),
            })

    return sorted(low_rated, key=lambda x: x["average_rating"])
