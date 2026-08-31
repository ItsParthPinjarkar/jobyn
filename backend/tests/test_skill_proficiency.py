"""
test_skill_proficiency.py — Phase 1 skill-verification feature.

Covers the proficiency inference and the confidence-discounted "provisional"
score split, including back-compat for legacy callers.
"""

from app.services.skill_proficiency import (
    infer_proficiency, LEVEL_CLAIMED, LEVEL_PROFICIENT,
)
from app.services.scoring_engine import (
    confidence_score_factor, MAX_SCORE_HEADROOM, PROVISIONAL_SCORE_FLOOR,
)
from app.services.role_readiness_engine import calculate_role_readiness

ROLE = "Full Stack Developer"


# ── Proficiency inference ──────────────────────────────────────────────────────

def test_bare_listed_skill_is_low_confidence():
    skills = ["python"]
    raw = "Skills: Python"
    prof = infer_proficiency(skills, raw, projects_text="", skills_text=raw)
    assert prof["python"]["level"] == LEVEL_CLAIMED
    assert prof["python"]["confidence"] < 0.5


def test_project_used_skill_with_cue_is_high_confidence():
    skills = ["python"]
    raw = "Projects: Built a production API in Python with 3 years of experience. Python Python."
    prof = infer_proficiency(skills, raw, projects_text=raw, skills_text="")
    assert prof["python"]["level"] == LEVEL_PROFICIENT
    assert prof["python"]["confidence"] >= 0.7


def test_confidence_factor_bounds():
    assert confidence_score_factor(0.0) == PROVISIONAL_SCORE_FLOOR
    assert confidence_score_factor(1.0) == 1.0
    assert PROVISIONAL_SCORE_FLOOR <= confidence_score_factor(0.5) <= 1.0


# ── Score split ────────────────────────────────────────────────────────────────

def _readiness(skills, raw, prof=None):
    return calculate_role_readiness(
        resume_skills=skills,
        sections_detected=["skills", "projects", "education"],
        raw_text=raw,
        role_name=ROLE,
        skill_proficiency=prof,
    )


def test_backcompat_no_proficiency_means_no_headroom():
    skills = ["python", "react", "sql", "git"]
    raw = "Skills: " + ", ".join(skills)
    r = _readiness(skills, raw)  # legacy call, no proficiency
    assert r["provisional_score"] == r["final_score"]
    assert r["score_headroom"] == 0
    assert r["verified_score"] == r["final_score"]


def test_low_confidence_skills_withhold_bounded_headroom():
    skills = ["python", "react", "sql", "git", "api", "html", "css"]
    raw = "Skills: " + ", ".join(skills)  # listed only -> all low confidence
    prof = infer_proficiency(skills, raw, projects_text="", skills_text=raw)
    r = _readiness(skills, raw, prof)
    assert r["score_headroom"] > 0
    assert r["score_headroom"] <= MAX_SCORE_HEADROOM
    assert r["provisional_score"] == r["final_score"] - r["score_headroom"]
    assert all(s["level"] == LEVEL_CLAIMED for s in r["skill_proficiency"])
    assert any(s["verifiable"] for s in r["skill_proficiency"])


def test_well_evidenced_skills_have_minimal_headroom():
    skills = ["python", "react"]
    raw = ("Projects: Built and deployed a production React app and a Python API. "
           "Designed, implemented and scaled both. Python React Python React.")
    prof = infer_proficiency(skills, raw, projects_text=raw, skills_text="")
    r = _readiness(skills, raw, prof)
    # strongly-evidenced skills shouldn't withhold much
    assert r["score_headroom"] <= 2
