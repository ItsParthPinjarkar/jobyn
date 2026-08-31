"""
manual_profile.py — Manual profile entry endpoint.

For users who don't have a resume file. Accepts structured data (skills,
education, projects, links) and runs the same scoring pipeline as the
resume upload endpoint.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from app.services.role_readiness_engine import calculate_role_readiness
from app.services.role_matrix import VALID_ROLES
from app.core.supabase_client import get_supabase
from app.services.encryption_service import encrypt_text, is_encryption_enabled
from app.core.auth import optional_user, AuthUser
from app.core.rate_limiter import upload_limit
from typing import Optional, List
import logging

log = logging.getLogger("manual_profile")

router = APIRouter()


class ManualProfileInput(BaseModel):
    """Structured profile data matching what resume parsing extracts."""
    skills: List[str] = Field(..., min_length=1, description="Canonical skill names")
    education: str = Field("", description="Education details (free text)")
    projects: str = Field("", description="Project descriptions (free text)")
    links: List[str] = Field(default_factory=list, description="GitHub, LinkedIn, portfolio URLs")
    target_role: str = Field("auto", description="Target role or 'auto' for best match")


def _build_synthetic_text(profile: ManualProfileInput) -> str:
    """
    Construct a synthetic resume text from form data so the existing
    scoring engines (ATS, project, structure) can analyse it.
    """
    parts = []

    # Skills section — always present since user selected skills
    parts.append("SKILLS")
    parts.append(", ".join(profile.skills))

    # Education section — present if user entered anything
    if profile.education.strip():
        parts.append("EDUCATION")
        parts.append(profile.education.strip())

    # Projects section — present if user entered anything
    if profile.projects.strip():
        parts.append("PROJECTS")
        parts.append(profile.projects.strip())

    # Links section — present if user entered any URLs
    if profile.links:
        parts.append("LINKS")
        parts.extend(profile.links)

    return "\n\n".join(parts)


@router.post("/profile/manual")
@upload_limit
async def manual_profile(
    request: Request,
    profile: ManualProfileInput,
    auth_user: Optional[AuthUser] = Depends(optional_user),
):
    """
    Submit profile data manually (without uploading a resume file).

    Accepts structured data — skills, education, projects, links — and
    runs the same deterministic scoring pipeline as the resume upload.
    Returns the identical response shape as POST /upload.
    """
    auto_detect = (profile.target_role == "auto")

    if not auto_detect and profile.target_role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{profile.target_role}'. Choose from: {VALID_ROLES}",
        )

    # Build synthetic raw_text from form data
    raw_text = _build_synthetic_text(profile)

    # Detect sections that the user filled in
    sections_detected = ["skills"]  # always present
    if profile.education.strip():
        sections_detected.append("education")
    if profile.projects.strip():
        sections_detected.append("projects")
    if profile.links:
        sections_detected.append("links")

    # Skills: use the user-provided list directly (they're already canonical names)
    skills = [s.strip().lower() for s in profile.skills if s.strip()]

    # ── Auto-detect best role (or use specified role) ────────────────────
    if auto_detect:
        all_results = {}
        for r in VALID_ROLES:
            all_results[r] = calculate_role_readiness(
                resume_skills=skills,
                sections_detected=sections_detected,
                raw_text=raw_text,
                role_name=r,
            )
        ranked = sorted(all_results.items(), key=lambda x: x[1].get("final_score", 0), reverse=True)
        best_role = ranked[0][0]
        result = all_results[best_role]

        role_matches = []
        for r, res in ranked:
            role_matches.append({
                "role": r,
                "score": res.get("final_score", 0),
                "core_coverage": res.get("core_coverage_percent", 0),
                "matched_core": len(res.get("missing_core_skills", [])),
                "total_core": res.get("core_coverage_percent", 0),
            })
        result["role_matches"] = role_matches
        result["auto_detected"] = True
        log.info("Manual profile — auto-detected role: %s (score=%s)", best_role, result["final_score"])
    else:
        result = calculate_role_readiness(
            resume_skills=skills,
            sections_detected=sections_detected,
            raw_text=raw_text,
            role_name=profile.target_role,
        )
        result["auto_detected"] = False

    result["filename"] = "manual_profile"
    result["detected_skills"] = skills
    result["sections_detected"] = sections_detected
    result["raw_text"] = raw_text
    result["links"] = profile.links

    # ── Persist to Supabase (non-fatal if unavailable) ───────────────────
    resume_id = None
    analysis_id = None
    db_warning = None

    effective_email = auth_user.email if auth_user else None

    if effective_email:
        try:
            sb = get_supabase()

            resume_data = {
                "filename": "manual_profile",
                "raw_text": encrypt_text(raw_text),
                "detected_skills": skills,
                "sections_detected": sections_detected,
                "links": profile.links,
                "encrypted": is_encryption_enabled(),
                "user_email": effective_email,
            }

            existing = (
                sb.table("resumes")
                .select("id")
                .eq("filename", "manual_profile")
                .eq("user_email", effective_email)
                .limit(1)
                .execute()
            )
            if existing.data:
                resume_id = existing.data[0]["id"]
                sb.table("resumes").update(resume_data).eq("id", resume_id).execute()
            else:
                resp = sb.table("resumes").insert(resume_data).execute()
                resume_id = resp.data[0]["id"]

            analysis_data = {
                "resume_id": resume_id,
                "role": result["role"],
                "final_score": result["final_score"],
                "readiness_category": result["readiness_category"],
                "core_coverage_percent": result["core_coverage_percent"],
                "optional_coverage_percent": result["optional_coverage_percent"],
                "project_score_percent": result["project_score_percent"],
                "ats_score_percent": result["ats_score_percent"],
                "structure_score_percent": result["structure_score_percent"],
                "missing_core_skills": result["missing_core_skills"],
                "missing_optional_skills": result["missing_optional_skills"],
                "recommendations": result["recommendations"],
            }

            existing_a = (
                sb.table("role_analyses")
                .select("id")
                .eq("resume_id", resume_id)
                .limit(1)
                .execute()
            )
            if existing_a.data:
                analysis_id = existing_a.data[0]["id"]
                sb.table("role_analyses").update(analysis_data).eq("id", analysis_id).execute()
            else:
                resp_a = sb.table("role_analyses").insert(analysis_data).execute()
                analysis_id = resp_a.data[0]["id"]

        except Exception as e:
            log.warning("Manual profile DB save failed: %s", e)
            db_warning = "DB save failed (scoring still valid)."
    else:
        db_warning = "No authenticated user — result not saved."

    result["resume_id"] = resume_id
    result["analysis_id"] = analysis_id
    if db_warning:
        result["db_warning"] = db_warning
    result["privacy_active"] = False

    return result


@router.get("/skills/list")
async def list_skills():
    """Return the full canonical skills dictionary for frontend dropdowns."""
    from app.core.config_loader import load_skills
    skills_dict = load_skills()
    # Return just the canonical names sorted
    return {"skills": sorted(skills_dict.keys())}
