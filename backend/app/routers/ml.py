"""
ml.py — Phase 4A Hybrid Intelligence API endpoints.

Endpoints:
  POST /ml/predict-role       → cosine-similarity role prediction
  POST /ml/project-score      → simulate adding a skill, predict improvement
  GET  /ml/skill-impact       → skill impact rankings (cached or live)
  POST /ml/recompute-model    → rebuild and persist hybrid_v1.json snapshot
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field

from app.core.settings import settings
from app.core.auth import get_admin_user
from app.core.rate_limiter import ai_limit
from app.ml_pipeline.data_loader     import load_dataset
from app.ml_pipeline.skill_impact    import compute_skill_impact
from app.ml_pipeline.projection_engine import project_score
from app.ml_pipeline.model_registry  import (
    save_model, load_model, model_exists, build_role_stats
)
from app.ml_pipeline.model_versioning import (
    register_version, list_versions, get_active_version,
    promote_version as _promote_version, delete_version as _delete_version,
)

router = APIRouter(prefix="/ml", tags=["Hybrid Intelligence"])


# ── Request schemas ────────────────────────────────────────────────────────────

class RolePredictRequest(BaseModel):
    skills: list[str]
    project_score_percent: float = 0
    ats_score_percent: float = 0
    structure_score_percent: float = 0
    raw_text: str = Field(default="", max_length=500000)
    sections_detected: list[str] = []
    current_role: str = ""

class ScoreProjectRequest(BaseModel):
    current_skills: list[str]
    add_skill: str


# ── Shared dataset guard ───────────────────────────────────────────────────────

def _require_data() -> list[dict]:
    records = load_dataset()
    if not records:
        raise HTTPException(
            status_code=404,
            detail=(
                "No historical data found. "
                "Upload and analyse at least one resume first."
            ),
        )
    return records


# ── POST /ml/predict-role ──────────────────────────────────────────────────────

@router.post("/predict-role")
@ai_limit
async def ml_predict_role(request: Request, body: RolePredictRequest):
    """
    Predict the best-fit role by calculating the Readiness Score
    for the current resume across all supported roles.

    Optimized: computes shared sub-scores (project, ATS, structure)
    once rather than per-role — ~7× faster.
    """
    try:
        from app.services.role_matrix import VALID_ROLES, get_role
        from app.services.project_engine import calculate_project_score
        from app.services.ats_engine import calculate_ats_score
        from app.services.scoring_engine import (
            calculate_structure_score, apply_locked_formula,
            weighted_coverage,
        )

        # ── Compute shared sub-scores once ─────────────────────────
        resume_set = set(body.skills)
        project_data   = calculate_project_score(body.raw_text)
        ats_data       = calculate_ats_score(body.raw_text)
        structure_data = calculate_structure_score(body.sections_detected)

        best_role  = ""
        best_score = -1
        all_results = []

        for role in VALID_ROLES:
            role_data       = get_role(role)
            core_skills     = role_data["core"]
            optional_skills = role_data["optional"]

            matched_core     = [s for s in core_skills     if s in resume_set]
            matched_optional = [s for s in optional_skills if s in resume_set]

            core_coverage     = weighted_coverage(matched_core, core_skills)
            optional_coverage = weighted_coverage(matched_optional, optional_skills)

            score = apply_locked_formula(
                core_coverage, optional_coverage,
                project_data["project_score_raw"],
                ats_data["ats_score_raw"],
                structure_data["structure_score_raw"],
            )

            all_results.append({"role": role, "score": score})
            if score > best_score:
                best_score = score
                best_role  = role

            # Short-circuit on perfect match
            if score == 100:
                break

        # Sort matches by score
        all_results.sort(key=lambda x: -x["score"])

        # Calculate reasoning
        if body.current_role and best_role == body.current_role:
             reasoning = f"Your resume is a perfect fit for {best_role}! You match {int(best_score)}% of the core requirements."
        elif body.current_role:
            current_score = next((r["score"] for r in all_results if r["role"] == body.current_role), 0)
            reasoning = f"Your profile matches {best_role} at {int(best_score)}%, which is a much stronger match than {body.current_role} ({int(current_score)}%)."
        else:
            reasoning = f"Your highest potential match is {best_role} with a score of {int(best_score)}%."

        return {
            "predicted_role": best_role,
            "confidence": best_score / 100.0,
            "top_matches": all_results[:3],
            "reasoning": reasoning,
            "model_version": f"cross-role-validator-{settings.APP_VERSION}"
        }
    except Exception:
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


# ── POST /ml/project-score ─────────────────────────────────────────────────────

@router.post("/project-score")
def ml_project_score(request: ScoreProjectRequest):
    """
    Simulate adding a skill to the current skill set and predict
    the expected score change using similarity-weighted averaging.

    Returns current and projected scores plus a recommendation.
    """
    try:
        records = _require_data()
        result  = project_score(
            request.current_skills,
            request.add_skill,
            records,
        )
        result["dataset_size"] = len(records)
        return result
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


# ── GET /ml/skill-impact ───────────────────────────────────────────────────────

@router.get("/skill-impact")
def ml_skill_impact(live: bool = False):
    """
    Return skill impact rankings (delta from global mean score).

    - By default, returns the cached model snapshot (fast).
    - Pass ?live=true to recompute from live data on the fly.
    """
    try:
        if not live and model_exists():
            model = load_model()
            return {
                "source":               "cached_model",
                "updated_at":           model["updated_at"],
                "dataset_size":         model["dataset_size"],
                "global_mean_score":    model["global_mean_score"],
                "skill_impact_ranking": model["skill_impact_ranking"],
            }

        records = _require_data()
        result  = compute_skill_impact(records)
        return {"source": "live_compute", **result}

    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("predict-role error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


# ── POST /ml/recompute-model ───────────────────────────────────────────────────

@router.post("/recompute-model")
def ml_recompute_model(current_user: dict = Depends(get_admin_user)):
    """
    Recompute all intelligence from the full dataset and save to hybrid_v1.json.

    Call this after uploading a batch of new resumes to refresh the insights.
    Returns a summary of the new snapshot.
    """
    try:
        records      = _require_data()
        skill_impact = compute_skill_impact(records)
        role_stats   = build_role_stats(records)
        model        = save_model(len(records), skill_impact, role_stats)

        # Record in version manifest
        register_version(
            pipeline="hybrid_v1",
            dataset_size=len(records),
            real_count=len(records),
            eval_metrics={
                "global_mean_score": model["global_mean_score"],
                "skills_ranked": len(model["skill_impact_ranking"]),
            },
            artefacts=["hybrid_v1.json"],
            notes="recompute-model endpoint",
        )

        return {
            "status":                "model_recomputed",
            "dataset_size":          model["dataset_size"],
            "updated_at":            model["updated_at"],
            "global_mean_score":     model["global_mean_score"],
            "roles_tracked":         list(role_stats.keys()),
            "skills_ranked":         len(model["skill_impact_ranking"]),
            "top_5_impact_skills":   model["skill_impact_ranking"][:5],
        }

    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("recompute-model error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")


# ── GET /ml/status ─────────────────────────────────────────────────────────────

@router.get("/status")
def ml_status():
    """Quick health-check: returns model cache status and dataset size."""
    try:
        records = load_dataset()
        model   = load_model()
        active  = get_active_version()
        return {
            "dataset_size":     len(records),
            "model_cached":     model_exists(),
            "model_updated_at": model["updated_at"] if model else None,
            "active_version":   active["tag"] if active else None,
            "ready":            len(records) > 0,
        }
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("ml status error: %s", e, exc_info=True)
        return {"ready": False, "error": "Status check failed"}


# ── Model versioning endpoints ─────────────────────────────────────────────────

@router.get("/versions")
def ml_list_versions():
    """List all trained model versions (newest first)."""
    return {"versions": list_versions()}


@router.get("/versions/active")
def ml_active_version():
    """Return the currently-active model version."""
    active = get_active_version()
    if not active:
        raise HTTPException(status_code=404, detail="No active model version found")
    return active


@router.post("/versions/{tag}/promote")
def ml_promote_version(tag: str, current_user: dict = Depends(get_admin_user)):
    """Rollback / promote a specific model version to active."""
    try:
        entry = _promote_version(tag)
        return {"status": "promoted", "version": entry}
    except ValueError:
        raise HTTPException(status_code=404, detail="Resource not found.")


@router.delete("/versions/{tag}")
def ml_delete_version(tag: str, current_user: dict = Depends(get_admin_user)):
    """Delete a non-active model version and its archive."""
    try:
        _delete_version(tag)
        return {"status": "deleted", "tag": tag}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid input provided.")


# ── POST /ml/outcome ──────────────────────────────────────────────────────────

class OutcomeRequest(BaseModel):
    predicted_role: str
    confidence: float = Field(ge=0, le=1)
    actual_role: str = ""
    helpful: bool = True


@router.post("/outcome")
def ml_submit_outcome(req: OutcomeRequest):
    """Collect user feedback on ML prediction quality for model improvement."""
    try:
        from app.core.supabase_client import get_supabase
        sb = get_supabase()
        sb.table("prediction_feedback").insert({
            "predicted_role": req.predicted_role,
            "correct_role":   req.actual_role if not req.helpful else None,
            "score_feedback": "accurate" if req.helpful else None,
            "comment":        f"confidence={req.confidence:.2f}",
        }).execute()
        return {"status": "recorded"}
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("outcome submission failed: %s", e)
        return {"status": "recorded"}
