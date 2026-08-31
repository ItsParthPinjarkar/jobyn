"""
interview.py — interview Q&A API router.

Endpoints:
  GET  /interview/question         → random question for a role
  POST /interview/evaluate         → score an answer
  GET  /interview/questions/{role} → all questions for a role
  GET  /interview/dependencies     → skill dependency graph
"""

from __future__ import annotations
import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.interview_engine import (
    get_random_question,
    get_questions_for_role,
    evaluate_answer,
)

router = APIRouter(prefix="/interview", tags=["Interview"])

_DEP_PATH = Path(__file__).resolve().parent.parent / "data" / "skill_dependencies.json"
_dependencies: dict | None = None


def _load_deps() -> dict:
    global _dependencies
    if _dependencies is None:
        with open(_DEP_PATH, encoding="utf-8") as f:
            _dependencies = json.load(f)
    return _dependencies


# ── Schemas ────────────────────────────────────────────────────

class EvaluateRequest(BaseModel):
    role:        str
    question_id: str
    answer:      str   # raw transcript or typed answer


# ── GET /interview/question ────────────────────────────────────

@router.get("/question")
def get_question(role: str = "Software Developer"):
    """Return a random interview question for the given role."""
    try:
        q = get_random_question(role)
        # Don't expose expected concepts to the client (would be cheating)
        return {
            "id":         q["id"],
            "question":   q["question"],
            "difficulty": q.get("difficulty", "Intermediate"),
            "role":       role,
        }
    except Exception:
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


# ── GET /interview/questions/{role} ───────────────────────────

@router.get("/questions/{role}")
def list_questions(role: str):
    """Return all question stubs (no concept lists) for a role."""
    questions = get_questions_for_role(role)
    return [
        {
            "id":         q["id"],
            "question":   q["question"],
            "difficulty": q.get("difficulty", "Intermediate"),
        }
        for q in questions
    ]


# ── POST /interview/evaluate ───────────────────────────────────

@router.post("/evaluate")
def evaluate(body: EvaluateRequest):
    """
    Score an interview answer.

    Input: role, question_id, answer (text from Web Speech API or typed).
    Output: score, grade, detected/missing concepts, feedback.
    """
    if not body.answer or len(body.answer.strip()) < 5:
        return {
            "score": 0,
            "grade": "Needs Practice",
            "detected_concepts": [],
            "missing_concepts": [],
            "total_concepts": 0,
            "feedback": "Your answer is too short to evaluate properly. Please explain in more detail.",
            "tip": "Aim for at least one full sentence covering the core mechanism.",
            "diagnostic_flag": True,
            "learning_path": []
        }

    result = evaluate_answer(body.role, body.question_id, body.answer)

    if "error" in result:
        raise HTTPException(404, result["error"])

    return result


# ── GET /interview/dependencies ───────────────────────────────

@router.get("/dependencies")
def get_dependencies():
    """Return the full skill dependency graph."""
    return _load_deps()


@router.get("/dependencies/{skill}")
def get_skill_deps(skill: str):
    """Return prerequisites for a specific skill."""
    deps = _load_deps()
    skill_lower = skill.lower()
    if skill_lower not in deps:
        return {"skill": skill, "prerequisites": [], "found": False}
    return {
        "skill":         skill,
        "prerequisites": deps[skill_lower],
        "found":         True,
    }
