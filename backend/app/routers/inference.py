"""
inference.py — ML inference API router.

Endpoints:
    GET/HEAD /health → lightweight service health check
    POST     /predict → full resume intelligence prediction
"""

import logging

from fastapi import APIRouter, HTTPException, Request

from app.schemas     import ResumeInput, ResumePrediction
from app.predictor   import predict_resume
from app.model_loader import is_loaded
from app.inference_utils import Timer
from app.core.rate_limiter import ai_limit

log = logging.getLogger("inference")
router = APIRouter(tags=["ML Inference"])


# ── GET/HEAD /health ───────────────────────────────────────────────────────────

@router.api_route("/health", methods=["GET", "HEAD"], summary="Service health check")
def health_check() -> dict[str, str]:
    """
    Lightweight health endpoint for uptime probes.
    """
    return {"status": "ok"}


# ── POST /predict ──────────────────────────────────────────────────────────────

@router.post(
    "/predict",
    response_model = ResumePrediction,
    summary        = "Predict role and score from resume features",
)
@ai_limit
async def predict_endpoint(request: Request, body: ResumeInput) -> ResumePrediction:
    """
    Run full ML inference on a resume feature vector.

    - Predicts the best-fit role (RandomForestClassifier)
    - Predicts the resume quality score (RandomForestRegressor)
    - Returns confidence and up to 3 weak areas

    **Skills must be provided in lowercase form matching the training vocabulary.**
    """
    if not is_loaded():
        raise HTTPException(
            status_code = 503,
            detail      = (
                "ML models are not loaded. "
                "Train models first: python -m app.ml_pipeline.train_v2 --seed 42"
            ),
        )

    t = Timer()
    try:
        result = predict_resume(body)
    except Exception:
        log.exception("Prediction failed for input: %s", body.model_dump())
        raise HTTPException(
            status_code = 500,
            detail      = "An internal error occurred. Please try again.",
        )

    elapsed_ms = t()
    log.info(
        "POST /predict  role=%s  score=%.1f  conf=%.2f  latency=%.1fms",
        result.predicted_role, result.resume_score,
        result.confidence, elapsed_ms,
    )

    return ResumePrediction(
        predicted_role    = result.predicted_role,
        confidence        = result.confidence,
        resume_score      = result.resume_score,
        weak_areas        = result.weak_areas,
        model_version     = result.model_version,
        inference_time_ms = elapsed_ms,
    )
