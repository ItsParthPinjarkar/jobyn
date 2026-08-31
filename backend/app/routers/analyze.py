"""
analyze.py — upload endpoint.

Scores the resume deterministically, then persists the result to Supabase.
If Supabase is not configured the scoring result is still returned — a
db_warning field is added to the response instead of raising a 500.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from app.services.resume_parser import parse_resume
from app.services.skill_dictionary import extract_skills
from app.services.skill_proficiency import infer_proficiency
from app.services.proficiency_store import load_verified
from app.services.role_readiness_engine import calculate_role_readiness
from app.services.role_matrix import VALID_ROLES
from app.core.supabase_client import get_supabase
from app.services.encryption_service import encrypt_text, is_encryption_enabled
from app.core.auth import optional_user, AuthUser
from app.utils.validation import validate_email, validate_resume_text, sanitize_filename
from app.core.rate_limiter import upload_limit
from pydantic import BaseModel
from typing import Optional
import asyncio
import logging
import magic

log = logging.getLogger("analyze")

router = APIRouter()


@router.post("/upload")
@upload_limit
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    role: str = Form("auto"),
    privacy_mode: bool = Form(False),
    user_email: str = Form(None),
    auth_user: Optional[AuthUser] = Depends(optional_user),
):
    """
    Upload a PDF or DOCX resume and receive a full readiness analysis.
    If role='auto' (default), the system auto-detects the best-fit role by
    scoring against all roles and choosing the highest match.
    Result is persisted to Supabase automatically.
    """
    safe_filename = sanitize_filename(file.filename)
    if not safe_filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    auto_detect = (role == "auto")

    if not auto_detect and role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{role}'. Choose from: {VALID_ROLES}",
        )

    # Only the AUTHENTICATED user's verified email may attribute persisted data.
    # A client-supplied `user_email` is NOT trusted: trusting it would let an
    # attacker POST a resume with someone else's email and have it land in that
    # victim's account/history (IDOR via attribution). Anonymous uploads are
    # still scored and returned, but never persisted.
    effective_email = validate_email(auth_user.email) if (auth_user and auth_user.email) else None

    try:
        file_bytes = await file.read()

        # MIME type validation — reject files that claim to be PDF/DOCX but aren't
        mime_type = magic.from_buffer(file_bytes, mime=True)
        allowed_mimes = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ]
        if mime_type not in allowed_mimes:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only PDF and DOCX files are accepted.",
            )

        # Guard against oversized uploads
        from app.core.settings import settings as _settings
        if len(file_bytes) > _settings.MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {_settings.MAX_UPLOAD_BYTES // 1_000_000}MB.")

        # ── Core deterministic pipeline ──────────────────────────────────────
        # parse_resume is blocking CPU work (pdfplumber/python-docx) — offload to
        # a thread so it doesn't stall the event loop for concurrent requests.
        parsed  = await asyncio.to_thread(parse_resume, file_bytes, safe_filename)

        # Validate extracted text
        text_ok, text_msg = validate_resume_text(parsed["raw_text"])
        if not text_ok:
            raise HTTPException(status_code=400, detail=text_msg)

        skills  = extract_skills(parsed["raw_text"])

        # Proficiency is role-independent — infer once, reuse for every role.
        proficiency = infer_proficiency(
            skills,
            parsed["raw_text"],
            parsed.get("projects_text", ""),
            parsed.get("skills_text", ""),
        )
        # Overlay any skills this user already verified (Phase 2) so their score
        # stays unlocked across re-analyses. No-op if the table isn't applied yet.
        for skill, info in (load_verified(effective_email) if effective_email else {}).items():
            if skill in proficiency:
                proficiency[skill] = info

        # ── Auto-detect best role (or use specified role) ────────────────────
        if auto_detect:
            all_results = {}
            for r in VALID_ROLES:
                all_results[r] = calculate_role_readiness(
                    resume_skills=skills,
                    sections_detected=parsed["sections_detected"],
                    raw_text=parsed["raw_text"],
                    role_name=r,
                    skill_proficiency=proficiency,
                )
            # Rank by final_score descending
            ranked = sorted(all_results.items(), key=lambda x: x[1].get("final_score", 0), reverse=True)
            best_role = ranked[0][0]
            result = all_results[best_role]

            # Build role_matches list for the frontend
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
            log.info("Auto-detected role: %s (score=%s) for %s", best_role, result["final_score"], safe_filename)
        else:
            result = calculate_role_readiness(
                resume_skills=skills,
                sections_detected=parsed["sections_detected"],
                raw_text=parsed["raw_text"],
                role_name=role,
                skill_proficiency=proficiency,
            )
            result["auto_detected"] = False

        result["filename"]          = safe_filename
        result["detected_skills"]   = skills
        result["sections_detected"] = parsed["sections_detected"]
        result["raw_text"]          = parsed["raw_text"]
        result["links"]             = parsed["links"]

        # ── Persist to Supabase (non-fatal if unavailable) ───────────────────
        resume_id   = None
        analysis_id = None
        db_warning  = None

        if privacy_mode:
            db_warning = "Privacy Mode Active: Data processed in-memory only. No cloud storage used."
        elif effective_email is None:
            # Anonymous upload — score and return, but do not persist (we will not
            # attribute data to an unverified, client-supplied identity).
            db_warning = "Sign in to save your analysis. Your result is shown but not stored."
        else:
            try:
                sb = get_supabase()

                # ── Save / update resume row ────────────────────────────────
                resume_data = {
                    "filename":          safe_filename,
                    "raw_text":          encrypt_text(parsed["raw_text"]),
                    "detected_skills":   skills,
                    "sections_detected": parsed["sections_detected"],
                    "links":             parsed["links"],
                    "encrypted":         is_encryption_enabled(),
                    "user_email":        effective_email,
                }

                # Check if this resume already exists for this user
                existing = (
                    sb.table("resumes")
                    .select("id")
                    .eq("filename", safe_filename)
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

                # ── Save / update analysis row ──────────────────────────────
                analysis_data = {
                    "resume_id":                 resume_id,
                    "role":                      result["role"],
                    "final_score":               result["final_score"],
                    "readiness_category":        result["readiness_category"],
                    "core_coverage_percent":     result["core_coverage_percent"],
                    "optional_coverage_percent": result["optional_coverage_percent"],
                    "project_score_percent":     result["project_score_percent"],
                    "ats_score_percent":         result["ats_score_percent"],
                    "structure_score_percent":   result["structure_score_percent"],
                    "missing_core_skills":       result["missing_core_skills"],
                    "missing_optional_skills":   result["missing_optional_skills"],
                    "recommendations":           result["recommendations"],
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

            except EnvironmentError:
                db_warning = "Supabase not configured — result not saved."
            except Exception:
                db_warning = "DB save failed (scoring still valid)."

        result["resume_id"]   = resume_id
        result["analysis_id"] = analysis_id
        if db_warning:
            result["db_warning"] = db_warning

        result["privacy_active"] = privacy_mode

        return result

    except HTTPException:
        raise  # Re-raise FastAPI HTTP exceptions (400, 413, etc.) without masking them
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid input provided.")
    except Exception:
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


class RolesResponse(BaseModel):
    valid_roles: list[str]


@router.get("/roles", response_model=RolesResponse)
def list_roles():
    """Return supported roles (loaded from roles.json)."""
    return {"valid_roles": VALID_ROLES}
