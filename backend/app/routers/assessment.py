"""
assessment.py — Phase 2 opt-in skill verification that unlocks score headroom.

Flow:
  POST /assessment/start   → picks the user's low-confidence, role-critical skills,
                             generates a short MCQ diagnostic, and returns it WITHOUT
                             the correct answers (grading is server-side so the score
                             can't be gamed). The answer key is cached under a token.
  POST /assessment/submit  → grades the answers per skill, recomputes the readiness
                             score treating passed skills as verified, persists the
                             passed skills, and returns the unlocked score.

Design decisions (from the product discussion):
  - Verification only ever *raises* the score. A failed skill does NOT lower it —
    instead it's reported as a gap for the roadmap (non-punitive), so taking the
    quiz is pure upside and users aren't scared off.
  - Targets only low-confidence + role-critical skills, capped, to keep it short.
"""

from __future__ import annotations
import uuid
import logging

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.core.auth import get_current_user, AuthUser
from app.core.cache import cache
from app.services.ai_service import ai_service
from app.services.skill_proficiency import infer_proficiency
from app.services.resume_parser import detect_sections
from app.services.role_readiness_engine import calculate_role_readiness
from app.services.role_matrix import get_role, role_exists
from app.services.proficiency_store import save_verified

log = logging.getLogger(__name__)
router = APIRouter(prefix="/assessment", tags=["Assessment"])

MAX_SKILLS = 5            # cap the diagnostic length
QUESTIONS_PER_SKILL = 2
PASS_FRACTION = 0.66      # ≥ 2/3 correct to verify a skill
VERIFY_BELOW = 0.70       # only quiz skills below this inferred confidence
TOKEN_TTL = 1800          # 30 min


class StartReq(BaseModel):
    role: str
    skills: list[str]
    raw_text: str = Field(default="", max_length=500_000)
    sections_detected: list[str] = []


class SubmitReq(BaseModel):
    token: str
    answers: dict[str, int]   # question id -> selected option index


def _proficiency_from_raw(skills: list[str], raw_text: str) -> dict:
    """Infer proficiency at the same fidelity as the analysis pipeline, recovering
    the projects/skills section text from raw_text (which is all we have here)."""
    sections = detect_sections(raw_text)
    return infer_proficiency(
        skills, raw_text, sections.get("projects", ""), sections.get("skills", "")
    )


def _verifiable_skills(role: str, skills: list[str], raw_text: str) -> tuple[list[str], dict]:
    """Low-confidence skills that are role-critical (core first, then optional)."""
    prof = _proficiency_from_raw(skills, raw_text)
    role_data = get_role(role) or {}
    core = set(role_data.get("core", []))
    optional = set(role_data.get("optional", []))
    skill_set = set(skills)

    low = [s for s in skills if prof.get(s, {}).get("confidence", 1.0) < VERIFY_BELOW]
    # core-critical first, then optional, preserving determinism
    ordered = [s for s in low if s in core and s in skill_set] + \
              [s for s in low if s in optional and s in skill_set and s not in core]
    return ordered[:MAX_SKILLS], prof


def _grade_skills(answer_key: dict, answers: dict) -> tuple[list[str], list[str]]:
    """Tally answers per skill; a skill passes at >= PASS_FRACTION correct.
    Returns (passed_skills, failed_skills)."""
    per_skill: dict[str, list[int]] = {}   # skill -> [correct, total]
    for qid, meta in answer_key.items():
        tally = per_skill.setdefault(meta["skill"], [0, 0])
        tally[1] += 1
        if answers.get(qid) == meta["correct_index"]:
            tally[0] += 1
    passed = [s for s, (c, t) in per_skill.items() if t and (c / t) >= PASS_FRACTION]
    failed = [s for s in per_skill if s not in passed]
    return passed, failed


@router.post("/start")
async def start_assessment(req: StartReq, user: AuthUser = Depends(get_current_user)):
    """Generate a short diagnostic for the user's unverified, role-critical skills."""
    if not role_exists(req.role):
        raise HTTPException(status_code=400, detail=f"Unknown role '{req.role}'.")

    verifiable, _prof = _verifiable_skills(req.role, req.skills, req.raw_text)
    if not verifiable:
        return {"token": None, "questions": [], "skills_to_verify": [],
                "message": "Your skills are already well-evidenced — nothing to verify."}

    questions: list[dict] = []
    answer_key: dict[str, dict] = {}
    for skill in verifiable:
        try:
            quiz = await ai_service.generate_quiz(skill)
        except Exception as e:
            log.warning("quiz generation failed for %s: %s", skill, e)
            continue
        for q in (quiz.get("questions") or [])[:QUESTIONS_PER_SKILL]:
            if "options" not in q or "correct_index" not in q:
                continue
            qid = uuid.uuid4().hex
            questions.append({"id": qid, "skill": skill,
                              "question": q.get("question", ""), "options": q["options"]})
            answer_key[qid] = {"skill": skill, "correct_index": q["correct_index"]}

    if not questions:
        raise HTTPException(status_code=503, detail="Could not generate a quiz right now. Try again shortly.")

    token = uuid.uuid4().hex
    cache.set(f"assess:{token}", {
        "user_email": user.email,
        "role": req.role,
        "skills": req.skills,
        "raw_text": req.raw_text,
        "sections_detected": req.sections_detected,
        "answer_key": answer_key,
        "verifiable": verifiable,
    }, ttl=TOKEN_TTL)

    return {"token": token, "skills_to_verify": verifiable, "questions": questions}


@router.post("/submit")
async def submit_assessment(req: SubmitReq, user: AuthUser = Depends(get_current_user)):
    """Grade the diagnostic, verify passed skills, and return the unlocked score."""
    ctx = cache.get(f"assess:{req.token}")
    if not ctx:
        raise HTTPException(status_code=400, detail="Assessment expired — please start again.")
    if ctx.get("user_email") and ctx["user_email"] != user.email:
        raise HTTPException(status_code=403, detail="This assessment belongs to another user.")

    passed, failed = _grade_skills(ctx["answer_key"], req.answers)

    role = ctx["role"]
    skills = ctx["skills"]
    raw_text = ctx["raw_text"]
    sections = ctx.get("sections_detected", [])

    # Build proficiency: resume-inferred, with passed skills bumped to verified.
    base_prof = _proficiency_from_raw(skills, raw_text)
    prof = dict(base_prof)
    for s in passed:
        prof[s] = {"level": "proficient", "confidence": 1.0, "verified": True}

    before = calculate_role_readiness(skills, sections, raw_text, role, skill_proficiency=base_prof)
    after = calculate_role_readiness(skills, sections, raw_text, role, skill_proficiency=prof)

    persisted = save_verified(user.email, passed) if passed else False
    cache.delete(f"assess:{req.token}")

    unlocked = max(0, after["provisional_score"] - before["provisional_score"])
    return {
        "passed_skills": passed,
        "failed_skills": failed,            # non-punitive: feed roadmap, not the score
        "previous_score": before["provisional_score"],
        "new_score": after["provisional_score"],
        "unlocked_points": unlocked,
        "verified_score": after["verified_score"],
        "remaining_headroom": after["score_headroom"],
        "persisted": persisted,
    }
