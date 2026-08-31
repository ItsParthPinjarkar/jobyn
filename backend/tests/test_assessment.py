"""
test_assessment.py — Phase 2 skill verification logic.

Covers verifiable-skill selection, server-side grading, and the score unlock
recompute (the HTTP/LLM/auth layers are not exercised here).
"""

from app.routers.assessment import _verifiable_skills, _grade_skills, PASS_FRACTION
from app.services.skill_proficiency import infer_proficiency
from app.services.role_readiness_engine import calculate_role_readiness

ROLE = "Full Stack Developer"
SKILLS = ["python", "react", "sql", "git", "api", "html", "css", "docker"]
RAW = "Skills: " + ", ".join(SKILLS)


def test_verifiable_targets_low_confidence_core_skills():
    verifiable, _prof = _verifiable_skills(ROLE, SKILLS, RAW)
    assert verifiable, "expected some skills to verify for a bare skills list"
    assert len(verifiable) <= 5
    core = {"python", "react", "sql", "git", "api"}
    assert all(s in core for s in verifiable)  # core-critical first


def test_no_verifiable_when_well_evidenced():
    raw = ("Projects: Built and deployed a production React app and a Python API; "
           "designed, scaled and maintained both. Python React Python React.")
    verifiable, _ = _verifiable_skills(ROLE, ["python", "react"], raw)
    assert verifiable == []


def test_grade_skills_pass_threshold():
    # 2 questions for python (both right), 2 for react (1 right -> fails)
    answer_key = {
        "q1": {"skill": "python", "correct_index": 0},
        "q2": {"skill": "python", "correct_index": 1},
        "q3": {"skill": "react", "correct_index": 2},
        "q4": {"skill": "react", "correct_index": 3},
    }
    answers = {"q1": 0, "q2": 1, "q3": 2, "q4": 0}  # python 2/2, react 1/2
    passed, failed = _grade_skills(answer_key, answers)
    assert passed == ["python"]
    assert failed == ["react"]


def test_verification_unlocks_score():
    base_prof = infer_proficiency(SKILLS, RAW)
    before = calculate_role_readiness(SKILLS, ["skills"], RAW, ROLE, skill_proficiency=base_prof)

    verifiable, _ = _verifiable_skills(ROLE, SKILLS, RAW)
    prof = infer_proficiency(SKILLS, RAW)
    for s in verifiable:
        prof[s] = {"level": "proficient", "confidence": 1.0, "verified": True}
    after = calculate_role_readiness(SKILLS, ["skills"], RAW, ROLE, skill_proficiency=prof)

    assert after["provisional_score"] > before["provisional_score"]
    assert after["provisional_score"] <= after["verified_score"]


def test_pass_fraction_is_two_thirds():
    assert abs(PASS_FRACTION - 0.66) < 0.01
