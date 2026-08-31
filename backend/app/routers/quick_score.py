"""
quick_score.py — anonymous resume scoring endpoint.

Upload a PDF/DOCX and get an instant readiness score without authentication.
Rate-limited to 5 requests/minute per IP. Results are ephemeral (not persisted).
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from app.services.resume_parser import parse_resume
from app.services.skill_dictionary import extract_skills
from app.services.skill_proficiency import infer_proficiency
from app.services.role_readiness_engine import calculate_role_readiness
from app.core.rate_limiter import limiter
import asyncio
import logging

log = logging.getLogger(__name__)

router = APIRouter(prefix="/quick-score", tags=["Quick Score"])

MAX_FILE_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("")
@limiter.limit("5/minute")
async def quick_score(
    request: Request,
    file: UploadFile = File(...),
):
    """
    Anonymous resume scoring — no auth required.
    Accepts a PDF or DOCX file (max 5 MB) and returns an instant
    readiness score against the best-matching role.  Results are
    ephemeral and not persisted to any database.
    """
    # ── Validate file extension ────────────────────────────────────────
    filename = (file.filename or "").lower()
    if not filename.endswith((".pdf", ".docx")):
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported.",
        )

    try:
        file_bytes = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read uploaded file.")

    # ── Validate file size ─────────────────────────────────────────────
    if len(file_bytes) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum size is 5 MB.",
        )

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        # ── Core pipeline ──────────────────────────────────────────────
        # parse_resume is blocking CPU work (pdfplumber/python-docx) — offload
        # to a thread so it doesn't stall the event loop for other requests.
        parsed = await asyncio.to_thread(parse_resume, file_bytes, file.filename or "upload.pdf")
        skills = extract_skills(parsed["raw_text"])

        # Score against a generic role to get a baseline readiness number.
        # NOTE: role_name must match a key in config/roles.json exactly (title
        # case), not a snake_case slug — a mismatch makes the engine return an
        # {"error": ...} dict that would silently score every resume 0.
        proficiency = infer_proficiency(
            skills,
            parsed["raw_text"],
            parsed.get("projects_text", ""),
            parsed.get("skills_text", ""),
        )
        result = calculate_role_readiness(
            resume_skills=skills,
            sections_detected=parsed["sections_detected"],
            raw_text=parsed["raw_text"],
            role_name="Full Stack Developer",
            skill_proficiency=proficiency,
        )

        # Fail loudly instead of returning a misleading 0 score.
        if result.get("error"):
            log.error("Quick score readiness error: %s", result["error"])
            raise HTTPException(
                status_code=500,
                detail="Scoring engine misconfigured. Please try again later.",
            )

        missing_count = len(result.get("missing_core_skills", []))

        return {
            # provisional (confidence-discounted) is the headline number; the
            # verified target + unlockable headroom drive the "verify to boost" CTA.
            "score": result.get("provisional_score", result.get("final_score", 0)),
            "verified_score": result.get("verified_score", result.get("final_score", 0)),
            "score_headroom": result.get("score_headroom", 0),
            "role": result.get("role", "full_stack_developer"),
            "readiness_category": result.get("readiness_category", "Needs Improvement"),
            "missing_count": missing_count,
            "skill_proficiency": result.get("skill_proficiency", []),
        }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e) or "Could not parse the uploaded file.")
    except Exception:
        log.exception("Quick score failed")
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")
