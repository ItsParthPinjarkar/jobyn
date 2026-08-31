"""
data.py — history, comparison, analytics, and export endpoints.

All reads are from Supabase. Aggregations are done in Python since
Supabase REST API doesn't expose GROUP BY directly.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from collections import defaultdict
import logging
from app.core.supabase_client import get_supabase
from app.core.auth import get_current_user, get_admin_user, AuthUser
from app.services.encryption_service import decrypt_text
from app.services.skill_proficiency import infer_proficiency
from app.services.resume_parser import detect_sections
from app.services.role_readiness_engine import calculate_role_readiness
from app.services.proficiency_store import load_verified

logger = logging.getLogger(__name__)

router = APIRouter()


def _db_error(e: Exception) -> HTTPException:
    logger.error("Database error: %s", e, exc_info=True)
    if isinstance(e, EnvironmentError):
        return HTTPException(
            status_code=500,
            detail="Database service unavailable. Please try again later.",
        )
    return HTTPException(
        status_code=500,
        detail="An internal error occurred. Please try again.",
    )


def _fmt(analysis: dict) -> dict:
    """Normalise a role_analyses row for API output."""
    return {
        "analysis_id":               analysis["id"],
        "resume_id":                 analysis["resume_id"],
        "role":                      analysis["role"],
        "final_score":               analysis["final_score"],
        "readiness_category":        analysis["readiness_category"],
        "core_coverage_percent":     analysis["core_coverage_percent"],
        "optional_coverage_percent": analysis["optional_coverage_percent"],
        "project_score_percent":     analysis["project_score_percent"],
        "ats_score_percent":         analysis["ats_score_percent"],
        "structure_score_percent":   analysis["structure_score_percent"],
        "missing_core_skills":       analysis.get("missing_core_skills")     or [],
        "missing_optional_skills":   analysis.get("missing_optional_skills") or [],
        "recommendations":           analysis.get("recommendations")         or [],
        "created_at":                analysis["created_at"],
    }


# ── GET /history/{resume_id} ───────────────────────────────────────────────────

@router.get("/history/{resume_id}")
def get_history(resume_id: int, user: AuthUser = Depends(get_current_user)):
    """
    Chronological list of all role analyses for a given resume.
    Shows score progression over multiple submissions.
    """
    try:
        sb = get_supabase()

        resume_resp = sb.table("resumes").select(
            "id, user_email, filename, detected_skills, sections_detected, links, created_at"
        ).eq("id", resume_id).single().execute()

        if not resume_resp.data:
            raise HTTPException(status_code=404, detail=f"Resume {resume_id} not found.")

        # IDOR prevention check. A missing/NULL owner is treated as a MISMATCH
        # (deny), not a pass — otherwise any authed user could read records that
        # have no owner by guessing the integer id.
        if resume_resp.data.get("user_email") != user.email:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this resource.")

        analyses_resp = sb.table("role_analyses").select("*").eq(
            "resume_id", resume_id
        ).order("created_at", desc=False).execute()

        return {
            "resume_id":        resume_id,
            "filename":         resume_resp.data["filename"],
            "detected_skills":  resume_resp.data.get("detected_skills") or [],
            "uploaded_at":      resume_resp.data["created_at"],
            "history":          [_fmt(a) for a in (analyses_resp.data or [])],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise _db_error(e)


# ── GET /compare/{resume_id} ───────────────────────────────────────────────────

@router.get("/compare/{resume_id}")
def compare_roles(resume_id: int, user: AuthUser = Depends(get_current_user)):
    """
    Latest analysis score per role for a resume.
    Useful for comparing how the candidate fits different roles.
    """
    try:
        sb = get_supabase()

        resume_resp = sb.table("resumes").select(
            "id, user_email, filename"
        ).eq("id", resume_id).single().execute()

        if not resume_resp.data:
            raise HTTPException(status_code=404, detail=f"Resume {resume_id} not found.")

        # IDOR prevention check. A missing/NULL owner is treated as a MISMATCH
        # (deny), not a pass — otherwise any authed user could read records that
        # have no owner by guessing the integer id.
        if resume_resp.data.get("user_email") != user.email:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this resource.")

        # Fetch all analyses ordered newest-first, then keep latest per role
        all_resp = sb.table("role_analyses").select("*").eq(
            "resume_id", resume_id
        ).order("created_at", desc=True).execute()

        seen_roles: set = set()
        latest_per_role: list = []

        for row in (all_resp.data or []):
            if row["role"] not in seen_roles:
                seen_roles.add(row["role"])
                latest_per_role.append(_fmt(row))

        # Sort best role first
        latest_per_role.sort(key=lambda x: -x["final_score"])

        return {
            "resume_id":       resume_id,
            "filename":        resume_resp.data["filename"],
            "best_role":       latest_per_role[0]["role"] if latest_per_role else None,
            "role_comparison": latest_per_role,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise _db_error(e)


# ── GET /analytics/role-stats ──────────────────────────────────────────────────

@router.get("/analytics/role-stats")
def role_stats(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=200, description="Items per page"),
    current_user: AuthUser = Depends(get_admin_user),
):
    """
    Aggregated analytics across all analyses in the database:
      - Average / min / max score per role
      - Top 10 most frequently missing skills
      - Top 10 most commonly detected skills

    Paginated: use page/per_page to control response size.
    """
    try:
        sb = get_supabase()
        offset = (page - 1) * per_page

        # Fetch paginated analyses
        analyses_resp = (
            sb.table("role_analyses")
            .select("role, final_score, missing_core_skills, missing_optional_skills", count="exact")
            .range(offset, offset + per_page - 1)
            .execute()
        )
        analyses = analyses_resp.data or []
        total_analyses = analyses_resp.count or len(analyses)

        # Fetch paginated resumes
        resumes_resp = (
            sb.table("resumes")
            .select("detected_skills", count="exact")
            .range(offset, offset + per_page - 1)
            .execute()
        )
        resumes = resumes_resp.data or []
        total_resumes = resumes_resp.count or len(resumes)

        # ── Per-role aggregation ─────────────────────────────────────────────
        role_buckets: dict = defaultdict(list)
        for a in analyses:
            role_buckets[a["role"]].append(a["final_score"])

        role_averages = [
            {
                "role":      role,
                "avg_score": round(sum(scores) / len(scores), 1),
                "min_score": min(scores),
                "max_score": max(scores),
                "count":     len(scores),
            }
            for role, scores in sorted(role_buckets.items())
        ]

        # ── Missing skill frequency ──────────────────────────────────────────
        missing_counter: dict = defaultdict(int)
        for a in analyses:
            for skill in (a.get("missing_core_skills") or []) + (a.get("missing_optional_skills") or []):
                missing_counter[skill] += 1

        # ── Detected skill frequency ─────────────────────────────────────────
        detected_counter: dict = defaultdict(int)
        for r in resumes:
            for skill in (r.get("detected_skills") or []):
                detected_counter[skill] += 1

        top_missing  = sorted(missing_counter.items(),  key=lambda x: -x[1])[:10]
        top_detected = sorted(detected_counter.items(), key=lambda x: -x[1])[:10]

        return {
            "total_analyses":    total_analyses,
            "total_resumes":     total_resumes,
            "page":              page,
            "per_page":          per_page,
            "role_averages":     role_averages,
            "top_missing_skills":  [{"skill": s, "count": c} for s, c in top_missing],
            "top_detected_skills": [{"skill": s, "count": c} for s, c in top_detected],
        }

    except Exception as e:
        raise _db_error(e)


# ── GET /session/latest/{email} ────────────────────────────────────────────────

def _enrich_recovered_analysis(analysis: dict, resume_row: dict, email: str) -> dict:
    """
    Recompute the confidence-aware fields (provisional_score, score_headroom,
    skill_proficiency) for a recovered session, and attach the resume's skill
    data — none of which is stored in role_analyses. Overlays the user's verified
    skills so a returning user sees the score they previously unlocked.

    Best-effort: returns the analysis unchanged if anything is missing/fails, so
    recovery never breaks.
    """
    detected = resume_row.get("detected_skills") or []
    sections = resume_row.get("sections_detected") or []
    links = resume_row.get("links") or []
    # Always surface the resume's skills on the recovered analysis.
    analysis["detected_skills"] = detected
    analysis["sections_detected"] = sections
    analysis["links"] = links

    try:
        raw_text = decrypt_text(resume_row.get("raw_text") or "")
        analysis["raw_text"] = raw_text
        if not detected or not raw_text:
            return analysis
        sec = detect_sections(raw_text)
        prof = infer_proficiency(detected, raw_text, sec.get("projects", ""), sec.get("skills", ""))
        for skill, info in load_verified(email).items():
            if skill in prof:
                prof[skill] = info
        recomputed = calculate_role_readiness(
            detected, sections, raw_text, analysis["role"], skill_proficiency=prof
        )
        verified = analysis.get("final_score", recomputed["verified_score"])
        headroom = recomputed["score_headroom"]
        analysis["verified_score"] = verified
        analysis["score_headroom"] = headroom
        analysis["provisional_score"] = max(0, verified - headroom)
        analysis["skill_proficiency"] = recomputed["skill_proficiency"]
    except Exception as e:
        logger.warning("Could not enrich recovered session with proficiency: %s", e)
    return analysis


@router.get("/session/latest/{email}")
def get_latest_session(email: str, user: AuthUser = Depends(get_current_user)):
    """
    Finds the latest resume for a user and returns its most recent analysis.
    Enforces authentication and email-level IDOR prevention checks.
    """
    if email.strip().lower() != user.email.lower():
        raise HTTPException(status_code=403, detail="Forbidden: You cannot retrieve session details for another user.")

    try:
        sb = get_supabase()

        # 1. Get the most recent resume for this email (with its skill data)
        resumes_resp = (
            sb.table("resumes")
            .select("id, detected_skills, sections_detected, links, raw_text")
            .eq("user_email", email)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        if not resumes_resp.data:
            return {"analysis": None, "prediction": None}

        resume_row = resumes_resp.data[0]
        resume_id = resume_row["id"]

        # 2. Get the latest analysis for that resume
        analysis_resp = sb.table("role_analyses").select("*").eq("resume_id", resume_id).order("created_at", desc=True).limit(1).execute()

        if not analysis_resp.data:
            return {"analysis": None, "prediction": None}

        analysis = _enrich_recovered_analysis(_fmt(analysis_resp.data[0]), resume_row, email)
        return {
            "analysis": analysis,
            "prediction": None  # We don't persist predictions yet, but we have the analysis
        }

    except Exception as e:
        raise _db_error(e)


# ── GET /export/dataset ────────────────────────────────────────────────────────

@router.get("/export/dataset")
def export_dataset(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=200, description="Items per page"),
    current_user: AuthUser = Depends(get_admin_user),
):
    """
    ML-ready dataset — paginated analyses joined with their resume skills.
    Suitable for future model training or offline analysis.
    """
    try:
        sb = get_supabase()
        offset = (page - 1) * per_page

        # Fetch paginated analyses ordered by newest first
        analyses_resp = (
            sb.table("role_analyses")
            .select("*", count="exact")
            .order("created_at", desc=True)
            .range(offset, offset + per_page - 1)
            .execute()
        )
        all_analyses = analyses_resp.data or []
        total_count = analyses_resp.count or len(all_analyses)

        # Keep only the latest analysis per resume_id (within this page)
        seen_resumes = set()
        analyses = []
        for a in all_analyses:
            if a["resume_id"] not in seen_resumes:
                seen_resumes.add(a["resume_id"])
                analyses.append(a)

        # Fetch resume detected_skills for the resumes in this page
        resume_ids = [a["resume_id"] for a in analyses]
        resumes_resp = sb.table("resumes").select("id, filename, detected_skills").in_("id", resume_ids).execute()
        resume_map = {r["id"]: r for r in (resumes_resp.data or [])}

        dataset = []
        for a in analyses:
            resume = resume_map.get(a["resume_id"], {})
            dataset.append({
                "analysis_id":               a["id"],
                "resume_id":                 a["resume_id"],
                "filename":                  resume.get("filename", ""),
                "role":                      a["role"],
                "final_score":               a["final_score"],
                "readiness_category":        a["readiness_category"],
                "core_coverage_percent":     a["core_coverage_percent"],
                "optional_coverage_percent": a["optional_coverage_percent"],
                "project_score_percent":     a["project_score_percent"],
                "ats_score_percent":         a["ats_score_percent"],
                "structure_score_percent":   a["structure_score_percent"],
                "detected_skills":           resume.get("detected_skills") or [],
                "missing_core_skills":       a.get("missing_core_skills")     or [],
                "missing_optional_skills":   a.get("missing_optional_skills") or [],
                "analyzed_at":               a["created_at"],
            })

        return {"total": total_count, "page": page, "per_page": per_page, "dataset": dataset}

    except Exception as e:
        raise _db_error(e)
# ── DELETE /history/{analysis_id} ──────────────────────────────────────────────
@router.delete("/history/analysis/{analysis_id}")
def delete_analysis(analysis_id: int, user: AuthUser = Depends(get_current_user)):
    """Delete a single role analysis entry. Enforces ownership check."""
    try:
        sb = get_supabase()

        # 1. Fetch analysis to get resume_id
        analysis_resp = sb.table("role_analyses").select("resume_id").eq("id", analysis_id).execute()
        if not analysis_resp.data:
            raise HTTPException(status_code=404, detail="Analysis not found.")

        resume_id = analysis_resp.data[0]["resume_id"]

        # 2. Fetch resume to check ownership
        resume_resp = sb.table("resumes").select("user_email").eq("id", resume_id).execute()
        if not resume_resp.data:
            raise HTTPException(status_code=404, detail="Associated resume not found.")

        # NULL owner is treated as a mismatch (deny), not a pass.
        if resume_resp.data[0].get("user_email") != user.email:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this resource.")

        # 3. Delete analysis
        sb.table("role_analyses").delete().eq("id", analysis_id).execute()
        return {"status": "deleted", "id": analysis_id}
    except HTTPException:
        raise
    except Exception as e:
        raise _db_error(e)

@router.delete("/history/resume/{resume_id}")
def delete_resume(resume_id: int, user: AuthUser = Depends(get_current_user)):
    """Delete an entire resume record and all its associated analyses. Enforces ownership check."""
    try:
        sb = get_supabase()

        # 1. Fetch resume to check ownership
        resume_resp = sb.table("resumes").select("user_email").eq("id", resume_id).execute()
        if not resume_resp.data:
            raise HTTPException(status_code=404, detail="Resume not found.")

        # NULL owner is treated as a mismatch (deny), not a pass.
        if resume_resp.data[0].get("user_email") != user.email:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this resource.")

        # 2. Delete resume
        sb.table("resumes").delete().eq("id", resume_id).execute()
        return {"status": "deleted", "id": resume_id}
    except HTTPException:
        raise
    except Exception as e:
        raise _db_error(e)


@router.delete("/user/data")
def delete_user_data(user: AuthUser = Depends(get_current_user)):
    """Delete all data associated with the authenticated user (GDPR right to erasure)."""
    try:
        sb = get_supabase()
        user_email = user.email

        # Tables with user_email column — direct delete
        tables_with_email = [
            "resumes",              # FK cascade also deletes role_analyses
            "prediction_feedback",
            "user_study_progress",
            "user_quiz_attempts",
            "content_feedback",
        ]

        deleted = {}
        for table in tables_with_email:
            try:
                resp = sb.table(table).delete().eq("user_email", user_email).execute()
                deleted[table] = len(resp.data) if resp.data else 0
            except Exception:
                deleted[table] = "error"

        # contributions uses submitted_by, not user_email
        try:
            resp = sb.table("contributions").delete().eq("submitted_by", user_email).execute()
            deleted["contributions"] = len(resp.data) if resp.data else 0
        except Exception:
            deleted["contributions"] = "error"

        # role_analyses cascades from resumes delete (FK ON DELETE CASCADE)
        deleted["role_analyses"] = "cascaded"

        return {"detail": "All your data has been deleted.", "tables_cleared": deleted}

    except HTTPException:
        raise
    except Exception as e:
        raise _db_error(e)
