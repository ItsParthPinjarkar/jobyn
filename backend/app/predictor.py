"""
predictor.py — feature transformation and inference logic.

Two public functions:
  transform_input(input_data, vocabulary) → np.ndarray
  predict_resume(input_data)              → dict

Supports both ONNX (preferred) and sklearn (legacy) model formats.

CRITICAL: The numeric feature ORDER must match the training pipeline exactly.

Training pipeline (feature_engineering.py) appended numeric features as:
  [core_coverage_percent/100, optional_coverage_percent/100,
   project_score_percent/100, ats_score_percent/100,
   structure_score_percent/100]

This file reproduces that exact ordering.
"""

from __future__ import annotations
import logging

import numpy as np

from app.model_loader import (
    get_role_model, get_score_model, get_label_encoder,
    get_vocabulary, get_vocab_index, get_metadata, is_onnx,
)
from app.inference_utils import clamp

log = logging.getLogger("predictor")

# ── Must match _NUMERIC_FIELDS order in feature_engineering.py ────────────────
_NUMERIC_FIELD_ORDER = [
    "core_coverage",        # → core_coverage_percent/100
    "optional_coverage",    # → optional_coverage_percent/100
    "project_score",        # → project_score_percent/100
    "ats_score",            # → ats_score_percent/100
    "structure_score",      # → structure_score_percent/100
]

_NUMERIC_DISPLAY_NAMES = {
    "core_coverage":    "Core Coverage",
    "optional_coverage": "Optional Coverage",
    "project_score":    "Project Score",
    "ats_score":        "ATS Score",
    "structure_score":  "Structure Score",
}

_WEAK_THRESHOLD = 50.0   # any value < 50 → considered weak


# ── Feature transformation ─────────────────────────────────────────────────────

def transform_input(input_data, vocabulary: list[str]) -> np.ndarray:
    """
    Convert a ResumeInput into a float32 feature matrix (1 × n_features).

    Layout matches training exactly:
      [binary_skill_0, …, binary_skill_N,
       core_cov/100, opt_cov/100, project/100, ats/100, struct/100]
    """
    vocab_index = get_vocab_index()
    skill_vec = [0.0] * len(vocabulary)

    for skill in input_data.skills:
        idx = vocab_index.get(skill.lower().strip())
        if idx is not None:
            skill_vec[idx] = 1.0

    numeric = [
        clamp(getattr(input_data, field, 0) / 100.0, 0.0, 1.0)
        for field in _NUMERIC_FIELD_ORDER
    ]

    feature_vector = skill_vec + numeric
    return np.array([feature_vector], dtype=np.float32)


# ── Prediction (ONNX + sklearn) ────────────────────────────────────────────────

def predict_resume(input_data) -> dict:
    """
    End-to-end resume prediction.

    1. Transform input → feature vector (matches training order).
    2. Predict role (classifier) + confidence.
    3. Predict score (regressor).
    4. Detect weak areas:
         • Primary: numeric features < 50 → labelled weak.
         • Fallback: bottom-3 by feature importance from classifier.
    5. Return ResumePrediction dict.
    """
    from app.schemas import ResumePrediction
    from app.inference_utils import Timer

    vocabulary  = get_vocabulary()
    le          = get_label_encoder()
    metadata    = get_metadata()
    using_onnx  = is_onnx()

    # ── 1. Feature vector ──────────────────────────────────────────────────
    X = transform_input(input_data, vocabulary)

    t = Timer()

    # ── 2. Role prediction ─────────────────────────────────────────────────
    if using_onnx:
        role_session = get_role_model()
        role_out = role_session.run(None, {"float_input": X})
        # ONNX with zipmap=False: [label_indices, probabilities]
        class_indices = role_out[0]    # shape (1,)
        probabilities = role_out[1]    # shape (1, n_classes)
        predicted_idx = int(class_indices[0])
        predicted_role = le.inverse_transform([predicted_idx])[0]
        confidence = float(probabilities[0][predicted_idx])
    else:
        clf = get_role_model()
        predicted_role = clf.predict(X)[0]
        proba = clf.predict_proba(X)[0]
        confidence = float(np.max(proba))

    # ── 3. Score prediction ────────────────────────────────────────────────
    if using_onnx:
        score_session = get_score_model()
        score_out = score_session.run(None, {"float_input": X})
        # score_out[0] is shape (1, 1); flatten before float() — numpy 2.x raises
        # on float() of a non-0-d array.
        predicted_score = int(round(float(np.asarray(score_out[0]).reshape(-1)[0])))
    else:
        reg = get_score_model()
        predicted_score = int(round(float(reg.predict(X)[0])))

    predicted_score = clamp(predicted_score, 0, 100)

    # ── 4. Weak area detection ─────────────────────────────────────────────
    weak_areas = _detect_weak_areas(
        input_data, X, vocabulary,
        using_onnx=using_onnx,
    )

    elapsed_ms = t()  # Timer is callable → elapsed milliseconds
    version = metadata.get("version", "v2")
    if using_onnx:
        version += "-onnx"

    return ResumePrediction(
        predicted_role    = predicted_role,
        confidence        = round(confidence, 4),
        resume_score      = predicted_score,
        weak_areas        = weak_areas,
        model_version     = version,
        inference_time_ms = round(elapsed_ms, 2),
        explanation       = f"Based on analysis of {metadata.get('trained_on_records', '?')} resumes.",
    )


# ── Weak area detection ───────────────────────────────────────────────────────

def _detect_weak_areas(input_data, X, vocabulary, using_onnx=False) -> list[str]:
    """
    Identify weak areas from resume.

    Primary (fast, interpretable):
      Any numeric feature < 50 → weak.

    Fallback (when no numeric feature < threshold):
      Bottom-3 by feature importance from classifier.
    """
    # Primary: check numeric values
    weak = []
    for field in _NUMERIC_FIELD_ORDER:
        val = getattr(input_data, field, 0)
        if val < _WEAK_THRESHOLD:
            display = _NUMERIC_DISPLAY_NAMES.get(field, field)
            weak.append(display)

    if weak:
        return weak[:3]

    # Fallback: feature importance from classifier
    try:
        if using_onnx:
            # ONNX doesn't expose feature importances — skip fallback
            return []
        clf = get_role_model()
        importances = clf.feature_importances_
        bottom_idx = np.argsort(importances)[:3]
        return [
            _idx_to_feature_name(i, vocabulary, input_data)
            for i in bottom_idx
        ]
    except Exception:
        pass

    return []


def _idx_to_feature_name(idx: int, vocabulary: list[str], input_data) -> str:
    """Map a feature vector index back to a human-readable name."""
    n_skills = len(vocabulary)
    if idx < n_skills:
        skill = vocabulary[idx]
        if skill in [s.lower().strip() for s in input_data.skills]:
            return skill
        return f"skill:{skill}"
    num_idx = idx - n_skills
    if 0 <= num_idx < len(_NUMERIC_FIELD_ORDER):
        return _NUMERIC_DISPLAY_NAMES.get(_NUMERIC_FIELD_ORDER[num_idx], str(idx))
    return str(idx)
