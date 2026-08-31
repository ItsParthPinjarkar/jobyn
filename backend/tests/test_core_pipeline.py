"""
Network-independent tests for the core scoring + ML pipeline.

These exercise extract_skills -> calculate_role_readiness -> predict_resume
WITHOUT touching Supabase. They are the regression guard for two bugs that the
Supabase-dependent ML tests (test_predict.py) could never catch, because those
tests fail on the DB connection before reaching this logic:
  - numpy 2.x: float() on a size-1 array in the ONNX score path raised
    "only 0-dimensional arrays can be converted to Python scalars".
  - Timer has no elapsed_ms() method (callable / context-manager only), so the
    inference path raised AttributeError on every call.

The ML test self-skips when model artifacts are absent (they are gitignored and
trained on deploy), so it runs locally and on deploy but skips cleanly in CI
until CI trains the models.
"""
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.services.skill_dictionary import extract_skills
from app.services.role_readiness_engine import calculate_role_readiness
from app.services.role_matrix import VALID_ROLES

_MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
_MODELS_AVAILABLE = (
    (_MODELS_DIR / "role_model_v2.onnx").exists()
    and (_MODELS_DIR / "score_model_v2.onnx").exists()
) or (
    (_MODELS_DIR / "role_model_v2.pkl").exists()
    and (_MODELS_DIR / "score_model_v2.pkl").exists()
)

SAMPLE_RESUME = """
Jane Doe - Final year CSE student
Skills: Python, Java, React, Node.js, SQL, Machine Learning, Pandas, NumPy,
Data Structures, Algorithms, Git, Docker, REST APIs, TensorFlow.
Experience: Built a full-stack web app with React frontend and FastAPI backend.
Projects: ML model for image classification using TensorFlow (92% accuracy).
Education: B.Tech Computer Science, CGPA 8.5.
"""
SECTIONS = ["skills", "experience", "projects", "education"]
CATEGORIES = {"Job Ready", "Improving", "Needs Development"}


def test_extract_skills_finds_canonical_and_fuzzy():
    skills = extract_skills(SAMPLE_RESUME)
    assert "python" in skills
    assert "react" in skills
    # synonym / fuzzy resolution: "Data Structures, Algorithms" -> "dsa"
    assert "dsa" in skills


def test_calculate_role_readiness_returns_valid_structure():
    skills = extract_skills(SAMPLE_RESUME)
    res = calculate_role_readiness(skills, SECTIONS, SAMPLE_RESUME, VALID_ROLES[0])
    assert "error" not in res
    assert isinstance(res["final_score"], (int, float))
    assert 0 <= res["final_score"] <= 100
    assert res["readiness_category"] in CATEGORIES


@pytest.mark.skipif(
    not _MODELS_AVAILABLE,
    reason="ML model artifacts not present (gitignored; trained on deploy)",
)
def test_predict_resume_returns_valid_prediction():
    """Regression guard for the numpy-2.x float() and Timer.elapsed_ms() bugs."""
    from app.model_loader import load_models
    from app.predictor import predict_resume

    load_models()

    skills = extract_skills(SAMPLE_RESUME)
    res = calculate_role_readiness(skills, SECTIONS, SAMPLE_RESUME, VALID_ROLES[0])
    inp = SimpleNamespace(
        skills=skills,
        project_score=res["project_score_percent"],
        ats_score=res["ats_score_percent"],
        structure_score=res["structure_score_percent"],
        core_coverage=res["core_coverage_percent"],
        optional_coverage=res["optional_coverage_percent"],
    )

    pred = predict_resume(inp)

    assert pred.predicted_role in VALID_ROLES
    assert 0.0 <= pred.confidence <= 1.0
    assert 0 <= pred.resume_score <= 100
    assert isinstance(pred.inference_time_ms, (int, float))
