"""
scoring_engine.py — config-driven scoring formula and readiness classification.

Weights and thresholds are loaded from config/scoring.json at startup.
The formula structure is locked but all coefficients are parameterised.
"""

from app.core.config_loader import load_scoring

# ── Load once at startup ───────────────────────────────────────────────────────
_SCORING_CONFIG = load_scoring()
_WEIGHTS        = _SCORING_CONFIG["weights"]
_THRESHOLDS     = _SCORING_CONFIG["readiness_thresholds"]

# ── Skill importance weights (high-value skills count more) ────────────────────
_IMPORTANCE_CFG = _SCORING_CONFIG.get("skill_importance", {})
_SKILL_WEIGHT: dict[str, float] = {}
for _tier in _IMPORTANCE_CFG.values():
    _w = _tier.get("weight", 1.0)
    for _s in _tier.get("skills", []):
        _SKILL_WEIGHT[_s] = _w

# Four possible resume sections; each contributes equally to structure score
_EXPECTED_SECTIONS = ["skills", "projects", "education", "links"]


# ── Sub-score helpers ──────────────────────────────────────────────────────────

def calculate_structure_score(sections_detected: list) -> dict:
    """
    Structure score 0.0 – 1.0.
    Each of the 4 expected sections found adds 1/4 = 0.25.
    """
    hits  = sum(1 for s in _EXPECTED_SECTIONS if s in sections_detected)
    total = round(hits / len(_EXPECTED_SECTIONS), 4)
    return {
        "structure_score_raw":     total,
        "structure_score_percent": int(total * 100),
    }


# ── Locked formula (coefficients from config) ─────────────────────────────────

def apply_locked_formula(
    core_coverage:      float,
    optional_coverage:  float,
    project_score_raw:  float,
    ats_score_raw:      float,
    structure_score_raw: float,
) -> int:
    """
    LOCKED formula — structure unchanged, coefficients from scoring.json:

        Final = (Core   × weights.core)      +
                (Optional × weights.optional) +
                (Project  × weights.project)  +
                (ATS      × weights.ats)      +
                (Structure × weights.structure)

    Returns integer 0 – 100.
    """
    raw = (
        core_coverage       * _WEIGHTS["core"]      +
        optional_coverage   * _WEIGHTS["optional"]  +
        project_score_raw   * _WEIGHTS["project"]   +
        ats_score_raw       * _WEIGHTS["ats"]        +
        structure_score_raw * _WEIGHTS["structure"]
    )
    return int(min(raw * 100, 100))


# ── Readiness classification ───────────────────────────────────────────────────

def weighted_coverage(matched: list, pool: list) -> float:
    """
    Compute weighted coverage: skills in skill_importance.high count 1.5×,
    medium 1.0×, low 0.7×, unlisted 1.0×.  Falls back to simple ratio when
    no importance config is present.
    """
    if not pool:
        return 0.0
    if not _SKILL_WEIGHT:
        return len(matched) / len(pool)
    total_weight = sum(_SKILL_WEIGHT.get(s, 1.0) for s in pool)
    achieved     = sum(_SKILL_WEIGHT.get(s, 1.0) for s in matched)
    return achieved / total_weight if total_weight else 0.0


# ── Confidence-discounted ("provisional") coverage ────────────────────────────

# An unverified claimed skill still counts at this fraction of its full value;
# the remaining slice is the "headroom" the user can unlock by verifying. Set
# high (0.8) so a genuinely-skilled user with a terse resume is never deflated
# too far. Max withheld per skill = (1 - floor) of its weight.
PROVISIONAL_SCORE_FLOOR = 0.8

# Hard cap on total points withheld, so the provisional score is never
# demoralisingly far below the verified target.
MAX_SCORE_HEADROOM = 15


def confidence_score_factor(confidence: float) -> float:
    """Map a skill confidence (0-1) to its score weighting (FLOOR-1.0)."""
    c = max(0.0, min(1.0, confidence))
    return PROVISIONAL_SCORE_FLOOR + (1.0 - PROVISIONAL_SCORE_FLOOR) * c


def weighted_coverage_provisional(matched: list, pool: list, confidence: dict) -> float:
    """
    Like weighted_coverage(), but each matched skill's contribution is scaled by
    confidence_score_factor(confidence[skill]) — so low-confidence (unverified)
    skills count for less. `confidence` maps skill -> confidence float; missing
    skills default to fully-confident (factor 1.0).
    """
    if not pool:
        return 0.0
    def factor(s):
        return confidence_score_factor(confidence.get(s, 1.0))

    if not _SKILL_WEIGHT:
        return sum(factor(s) for s in matched) / len(pool)
    total_weight = sum(_SKILL_WEIGHT.get(s, 1.0) for s in pool)
    achieved = sum(_SKILL_WEIGHT.get(s, 1.0) * factor(s) for s in matched)
    return achieved / total_weight if total_weight else 0.0


def get_readiness_category(final_score: int) -> str:
    """
    Classify score using thresholds from scoring.json:
      ≥ job_ready  → "Job Ready"
      ≥ improving  → "Improving"
      else         → "Needs Development"
    """
    if final_score >= _THRESHOLDS["job_ready"]:
        return "Job Ready"
    elif final_score >= _THRESHOLDS["improving"]:
        return "Improving"
    return "Needs Development"
