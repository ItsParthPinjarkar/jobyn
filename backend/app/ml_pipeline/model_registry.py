"""
model_registry.py — persist and load all ML artefacts.

Two separate storage areas:

  1. hybrid_v1.json  (Phase 4A — statistics, no sklearn)
     Saved inside ml_pipeline/ directory.

  2. models/ directory  (Phase 4B — sklearn RandomForest models)
       role_model_v1.pkl
       score_model_v1.pkl
       vocabulary_v1.pkl
       metadata_v1.json
"""

from __future__ import annotations
import json
import logging
import pickle
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict

logger = logging.getLogger(__name__)

# ── Paths ──────────────────────────────────────────────────────────────────────
_ML_DIR    = Path(__file__).resolve().parent
_MODELS_DIR = _ML_DIR.parent.parent / "models"     # backend/models/

HYBRID_JSON_PATH = _ML_DIR / "hybrid_v1.json"


# ═══════════════════════════════════════════════════════════════════════════════
#  Phase 4A — statistics snapshot (hybrid_v1.json)
# ═══════════════════════════════════════════════════════════════════════════════

def save_model(
    dataset_size:      int,
    skill_impact_data: dict,
    role_stats:        dict | None = None,
) -> dict:
    model = {
        "version":              "hybrid_v1",
        "updated_at":           datetime.now(timezone.utc).isoformat(),
        "dataset_size":         dataset_size,
        "global_mean_score":    skill_impact_data.get("global_mean_score", 0),
        "skill_impact_ranking": skill_impact_data.get("skill_impact_ranking", []),
        "role_stats":           role_stats or {},
    }
    with open(HYBRID_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(model, f, indent=2)
    return model


def load_model() -> dict | None:
    if not HYBRID_JSON_PATH.exists():
        return None
    with open(HYBRID_JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def model_exists() -> bool:
    return HYBRID_JSON_PATH.exists()


def build_role_stats(records: list[dict]) -> dict:
    buckets: dict = defaultdict(list)
    for r in records:
        buckets[r["role"]].append(r["final_score"])
    return {
        role: {
            "avg":   round(sum(s) / len(s), 1),
            "min":   min(s),
            "max":   max(s),
            "count": len(s),
        }
        for role, s in buckets.items()
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  Phase 4B — sklearn RandomForest models
# ═══════════════════════════════════════════════════════════════════════════════

def _ensure_models_dir() -> Path:
    _MODELS_DIR.mkdir(parents=True, exist_ok=True)
    return _MODELS_DIR


def save_trained_models(
    clf:          object,
    reg:          object,
    le:           object,          # sklearn LabelEncoder
    vocab:        list[str],
    eval_metrics: dict,
    dataset_size: int,
    seed:         int = 42,
) -> dict:
    """
    Persist all sklearn artefacts to backend/models/.

    Saves:
      role_model_v1.pkl   — {model: clf, label_encoder: le}
      score_model_v1.pkl  — reg
      vocabulary_v1.pkl   — vocab list
      metadata_v1.json    — training summary
    """
    d = _ensure_models_dir()

    with open(d / "role_model_v1.pkl",  "wb") as f:
        pickle.dump({"model": clf, "label_encoder": le}, f)

    with open(d / "score_model_v1.pkl", "wb") as f:
        pickle.dump(reg, f)

    with open(d / "vocabulary_v1.pkl",  "wb") as f:
        pickle.dump(vocab, f)

    metadata = {
        "version":        "v1.0",
        "trained_at":     datetime.now(timezone.utc).isoformat(),
        "random_seed":    seed,
        "dataset_size":   dataset_size,
        "vocabulary_size": len(vocab),
        "evaluation":     eval_metrics,
        "artefacts": {
            "role_classifier": "role_model_v1.pkl",
            "score_regressor": "score_model_v1.pkl",
            "vocabulary":      "vocabulary_v1.pkl",
        },
    }
    with open(d / "metadata_v1.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Models saved to {d}")
    return metadata


def load_trained_models() -> dict | None:
    """
    Load all sklearn artefacts from backend/models/.
    Returns None if any required file is missing.
    """
    d = _MODELS_DIR
    paths = {
        "role":  d / "role_model_v1.pkl",
        "score": d / "score_model_v1.pkl",
        "vocab": d / "vocabulary_v1.pkl",
    }
    if not all(p.exists() for p in paths.values()):
        return None

    with open(paths["role"],  "rb") as f:
        role_data = pickle.load(f)
    with open(paths["score"], "rb") as f:
        reg = pickle.load(f)
    with open(paths["vocab"], "rb") as f:
        vocab = pickle.load(f)

    return {
        "classifier":    role_data["model"],
        "label_encoder": role_data["label_encoder"],
        "regressor":     reg,
        "vocabulary":    vocab,
    }


def trained_models_exist() -> bool:
    d = _MODELS_DIR
    return all(
        (d / name).exists()
        for name in ("role_model_v1.pkl", "score_model_v1.pkl", "vocabulary_v1.pkl")
    )


def load_training_metadata() -> dict | None:
    path = _MODELS_DIR / "metadata_v1.json"
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ═══════════════════════════════════════════════════════════════════════════════
#  Phase 4B v2 — RandomForest v2 models (synthetic_v2 dataset)
#  V1 artefacts are NEVER touched by these functions.
# ═══════════════════════════════════════════════════════════════════════════════

_V2_HYPERPARAMS = {
    "n_estimators":    300,
    "max_depth":       20,
    "min_samples_leaf": 3,
}


def save_trained_models_v2(
    clf:             object,
    reg:             object,
    le:              object,
    vocab:           list[str],
    eval_metrics:    dict,
    real_count:      int,
    synthetic_count: int,
    seed:            int = 42,
) -> dict:
    """
    Persist v2 artefacts to backend/models/.

    Saves:
      role_model_v2.pkl   — {model: clf, label_encoder: le}
      score_model_v2.pkl  — reg
      vocabulary_v2.pkl   — vocab list
      metadata_v2.json    — training summary (exact spec format)
    """
    d = _ensure_models_dir()

    with open(d / "role_model_v2.pkl",  "wb") as f:
        pickle.dump({"model": clf, "label_encoder": le}, f)

    with open(d / "score_model_v2.pkl", "wb") as f:
        pickle.dump(reg, f)

    with open(d / "vocabulary_v2.pkl",  "wb") as f:
        pickle.dump(vocab, f)

    clf_m = eval_metrics["classifier"]
    reg_m = eval_metrics["regressor"]

    metadata = {
        "version":             "2.0",
        "trained_on_records":  real_count + synthetic_count,
        "real_records":        real_count,
        "synthetic_records":   synthetic_count,
        "accuracy":            clf_m["accuracy"],
        "f1_macro":            clf_m["f1_macro"],
        "rmse":                reg_m["rmse"],
        "r2":                  reg_m["r2"],
        "hyperparameters":     _V2_HYPERPARAMS,
        "date_trained":        datetime.now(timezone.utc).isoformat(),
        "random_seed":         seed,
        "vocabulary_size":     len(vocab),
        "evaluation":          eval_metrics,
        "artefacts": {
            "role_classifier": "role_model_v2.pkl",
            "score_regressor": "score_model_v2.pkl",
            "vocabulary":      "vocabulary_v2.pkl",
        },
    }
    with open(d / "metadata_v2.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"Models v2 saved to {d}")
    return metadata


def load_trained_models_v2() -> dict | None:
    """Load v2 artefacts. Returns None if not yet trained."""
    d = _MODELS_DIR
    paths = {
        "role":  d / "role_model_v2.pkl",
        "score": d / "score_model_v2.pkl",
        "vocab": d / "vocabulary_v2.pkl",
    }
    if not all(p.exists() for p in paths.values()):
        return None

    with open(paths["role"],  "rb") as f:
        role_data = pickle.load(f)
    with open(paths["score"], "rb") as f:
        reg = pickle.load(f)
    with open(paths["vocab"], "rb") as f:
        vocab = pickle.load(f)

    return {
        "classifier":    role_data["model"],
        "label_encoder": role_data["label_encoder"],
        "regressor":     reg,
        "vocabulary":    vocab,
    }


def trained_models_v2_exist() -> bool:
    d = _MODELS_DIR
    return all(
        (d / name).exists()
        for name in ("role_model_v2.pkl", "score_model_v2.pkl", "vocabulary_v2.pkl")
    )


def load_training_metadata_v2() -> dict | None:
    path = _MODELS_DIR / "metadata_v2.json"
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
