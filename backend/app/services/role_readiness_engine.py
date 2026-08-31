"""
role_readiness_engine.py — orchestrates the full analysis pipeline.

Calls all sub-engines, applies the locked (but parameterised) formula,
and returns the dashboard-ready response dict.
"""

from app.services.role_matrix import get_role, role_exists, VALID_ROLES
from app.services.project_engine import calculate_project_score
from app.services.ats_engine import calculate_ats_score
from app.services.scoring_engine import (
    calculate_structure_score,
    apply_locked_formula,
    get_readiness_category,
    weighted_coverage,
    weighted_coverage_provisional,
    MAX_SCORE_HEADROOM,
)
from app.services.skill_gap_engine import generate_skill_gap_analysis

# Below this confidence a claimed skill is considered worth verifying (it both
# withholds score headroom and is a candidate for the optional diagnostic quiz).
_VERIFY_BELOW = 0.70


def calculate_role_readiness(
    resume_skills:     list,
    sections_detected: list,
    raw_text:          str,
    role_name:         str,
    skill_proficiency: dict | None = None,
) -> dict:
    """
    Main orchestrator — returns the complete dashboard-ready response.

    Args:
        resume_skills:     Canonical skill names detected in the resume.
        sections_detected: Sections found by the resume parser.
        raw_text:          Full cleaned resume text.
        role_name:         Target role (must exist in roles.json).

    Returns:
        A dict matching the required API response format.
    """
    if not role_exists(role_name):
        return {
            "error": (
                f"Role '{role_name}' not found in roles.json. "
                f"Valid roles: {VALID_ROLES}"
            )
        }

    role_data       = get_role(role_name)
    core_skills     = role_data["core"]
    optional_skills = role_data["optional"]
    resume_set      = set(resume_skills)

    # ── Coverage ratios (0.0 – 1.0) ─────────────────────────────────────────
    matched_core     = [s for s in core_skills     if s in resume_set]
    matched_optional = [s for s in optional_skills if s in resume_set]

    # Weighted coverage: high-importance skills (DSA, system design) count 1.5×
    core_coverage     = weighted_coverage(matched_core, core_skills)
    optional_coverage = weighted_coverage(matched_optional, optional_skills)

    # ── Sub-scores ───────────────────────────────────────────────────────────
    project_data   = calculate_project_score(raw_text)
    ats_data       = calculate_ats_score(raw_text)
    structure_data = calculate_structure_score(sections_detected)

    # ── Locked formula (weights from scoring.json) ───────────────────────────
    final_score = apply_locked_formula(
        core_coverage,
        optional_coverage,
        project_data["project_score_raw"],
        ats_data["ats_score_raw"],
        structure_data["structure_score_raw"],
    )

    # ── Readiness category (thresholds from scoring.json) ────────────────────
    readiness_category = get_readiness_category(final_score)

    # ── Provisional score: discount unverified claimed skills ────────────────
    # `skill_proficiency` maps skill -> {"level", "confidence", ...}. When absent
    # (legacy callers), the provisional score equals the verified score and no
    # headroom is withheld — fully back-compatible.
    prof = skill_proficiency or {}
    conf_map = {s: v.get("confidence", 1.0) for s, v in prof.items()}

    prov_core     = weighted_coverage_provisional(matched_core,     core_skills,     conf_map)
    prov_optional = weighted_coverage_provisional(matched_optional, optional_skills, conf_map)
    provisional_raw = apply_locked_formula(
        prov_core,
        prov_optional,
        project_data["project_score_raw"],
        ats_data["ats_score_raw"],
        structure_data["structure_score_raw"],
    )
    # Cap how far provisional can sit below the verified target.
    headroom = max(0, min(final_score - provisional_raw, MAX_SCORE_HEADROOM))
    provisional_score = final_score - headroom

    # Per-skill proficiency for the role-relevant (scored) skills, flagging the
    # low-confidence ones that the verification quiz should target.
    scored_skills = [s for s in (matched_core + matched_optional)]
    skill_levels = [
        {
            "skill":      s,
            "level":      prof.get(s, {}).get("level", "claimed"),
            "confidence": prof.get(s, {}).get("confidence", 1.0),
            "is_core":    s in core_skills,
            "verifiable": prof.get(s, {}).get("confidence", 1.0) < _VERIFY_BELOW,
        }
        for s in scored_skills
    ]

    # ── Gap analysis ─────────────────────────────────────────────────────────
    gap = generate_skill_gap_analysis(
        resume_skills, core_skills, optional_skills, role_name
    )

    return {
        "role":                      role_name,
        "final_score":               final_score,          # verified target (unchanged)
        "verified_score":            final_score,
        "provisional_score":         provisional_score,     # shown by default
        "score_headroom":            headroom,              # unlockable via verification
        "readiness_category":        readiness_category,

        "core_coverage_percent":     int(core_coverage     * 100),
        "optional_coverage_percent": int(optional_coverage * 100),
        "project_score_percent":     project_data["project_score_percent"],
        "ats_score_percent":         ats_data["ats_score_percent"],
        "structure_score_percent":   structure_data["structure_score_percent"],

        "missing_core_skills":       gap["missing_core_skills"],
        "missing_optional_skills":   gap["missing_optional_skills"],
        "recommendations":           gap["recommendations"],
        "skill_proficiency":         skill_levels,
    }
