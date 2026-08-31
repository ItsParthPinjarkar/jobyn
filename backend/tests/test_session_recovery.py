"""
test_session_recovery.py — Phase 2.2.

A recovered session (from /session/latest) stores only the thin role_analyses
row. _enrich_recovered_analysis must re-attach the resume's skill data and
recompute the confidence-aware fields so the provisional/verify UI works for
returning users too.
"""

from app.routers.data import _enrich_recovered_analysis

STORED = {
    "role": "Full Stack Developer",
    "final_score": 78,
    "readiness_category": "Job Ready",
    "core_coverage_percent": 86,
}
RESUME_ROW = {
    "detected_skills": ["python", "react", "sql", "git", "api", "html", "css"],
    "sections_detected": ["skills", "education"],
    "links": [],
    "raw_text": "Skills: python, react, sql, git, api, html, css",
}


def test_recovery_attaches_skills_and_provisional():
    out = _enrich_recovered_analysis(dict(STORED), dict(RESUME_ROW), "nobody@example.com")
    # resume skill data re-attached
    assert out["detected_skills"] == RESUME_ROW["detected_skills"]
    assert "raw_text" in out
    # confidence-aware fields recomputed
    assert out["verified_score"] == 78
    assert out["score_headroom"] >= 0
    assert out["provisional_score"] == 78 - out["score_headroom"]
    assert len(out["skill_proficiency"]) > 0


def test_recovery_is_graceful_without_resume_text():
    # No raw_text / skills -> must not raise, still attaches (empty) skill arrays.
    out = _enrich_recovered_analysis(dict(STORED), {"detected_skills": [], "raw_text": ""}, "nobody@example.com")
    assert out["detected_skills"] == []
    assert out["role"] == "Full Stack Developer"
