"""
model_loader.py — load and cache v2 ML artefacts at application startup.

Loading priority: ONNX (small, fast) → pickle (fallback).
ONNX models are ~10x smaller and load faster via onnxruntime.

Design rules:
  - Models are loaded ONCE into module-level singletons.
  - NO retraining. NO model mutation. Pure read-only after startup.
  - If ONNX files exist → use onnxruntime (preferred).
  - If only pickle files exist → fall back to pickle (legacy).
  - If neither → descriptive RuntimeError (stops the server).
  - All accessors verify _loaded state before returning.
"""

from __future__ import annotations
import json
import logging
import pickle
from pathlib import Path

log = logging.getLogger("model_loader")

_MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

# ── Module-level singletons (populated once at startup) ────────────────────────
_role_session:  object        = None   # onnxruntime.InSession (role classifier)
_score_session: object        = None   # onnxruntime.InferenceSession (score regressor)
_label_encoder: object        = None   # sklearn LabelEncoder
_vocabulary:    list[str]     = None   # sorted skill vocab
_vocab_index:   dict[str, int] = None  # pre-built index for O(1) lookup
_metadata:      dict          = None   # metadata_v2.json
_use_onnx:      bool          = False  # True if loaded from ONNX
_loaded:        bool          = False


def load_models() -> None:
    """
    Load all v2 artefacts from backend/models/.
    Prefers ONNX files (smaller, faster) over pickle.
    Idempotent — safe to call multiple times (no-op after first load).

    Raises RuntimeError if no model files found.
    """
    global _role_session, _score_session, _label_encoder, _vocabulary, _vocab_index, _metadata, _use_onnx, _loaded

    if _loaded:
        return

    onnx_role  = _MODELS_DIR / "role_model_v2.onnx"
    onnx_score = _MODELS_DIR / "score_model_v2.onnx"
    pkl_role   = _MODELS_DIR / "role_model_v2.pkl"
    pkl_score  = _MODELS_DIR / "score_model_v2.pkl"
    le_pkl     = _MODELS_DIR / "label_encoder_v2.pkl"
    vocab_pkl  = _MODELS_DIR / "vocabulary_v2.pkl"
    meta_json  = _MODELS_DIR / "metadata_v2.json"

    # ── Check ONNX availability ────────────────────────────────────────────
    if onnx_role.exists() and onnx_score.exists():
        _load_onnx(onnx_role, onnx_score, le_pkl, vocab_pkl, meta_json)
        _use_onnx = True
        log.info("ML models loaded from ONNX (fast path).")
    elif pkl_role.exists() and pkl_score.exists():
        _load_pickle(pkl_role, pkl_score, vocab_pkl, meta_json)
        _use_onnx = False
        log.info("ML models loaded from pickle (legacy path).")
    else:
        raise RuntimeError(
            f"No ML model files found in {_MODELS_DIR}. "
            f"Expected ONNX: {onnx_role.name}, {onnx_score.name} "
            f"or pickle: {pkl_role.name}, {pkl_score.name}. "
            f"Train models: python -m app.ml_pipeline.train_v2 --seed 42"
        )

    _loaded = True


def _load_onnx(onnx_role, onnx_score, le_pkl, vocab_pkl, meta_json):
    """Load models from ONNX format (preferred)."""
    global _role_session, _score_session, _label_encoder, _vocabulary, _vocab_index, _metadata

    import onnxruntime as ort

    opts = ort.SessionOptions()
    opts.inter_op_num_threads = 2
    opts.intra_op_num_threads = 2

    _role_session = ort.InferenceSession(str(onnx_role), opts)
    _score_session = ort.InferenceSession(str(onnx_score), opts)

    # Label encoder (tiny pickle, always needed for role prediction)
    if le_pkl.exists():
        with open(le_pkl, "rb") as f:
            _label_encoder = pickle.load(f)
    else:
        # Fallback: extract from pickle role model
        with open(_MODELS_DIR / "role_model_v2.pkl", "rb") as f:
            role_data = pickle.load(f)
            _label_encoder = role_data.get("label_encoder") or role_data.get("le")

    _load_vocab_meta(vocab_pkl, meta_json)
    log.info("ONNX role model input: %s", _role_session.get_inputs()[0].shape)
    log.info("ONNX score model input: %s", _score_session.get_inputs()[0].shape)


def _load_pickle(pkl_role, pkl_score, vocab_pkl, meta_json):
    """Load models from pickle format (legacy fallback)."""
    global _role_session, _score_session, _label_encoder, _vocabulary, _vocab_index, _metadata

    with open(pkl_role, "rb") as f:
        role_data = pickle.load(f)
    _role_session = role_data["model"]
    _label_encoder = role_data["label_encoder"]

    with open(pkl_score, "rb") as f:
        _score_session = pickle.load(f)

    _load_vocab_meta(vocab_pkl, meta_json)


def _load_vocab_meta(vocab_pkl, meta_json):
    """Load vocabulary and metadata (shared by both paths)."""
    global _vocabulary, _vocab_index, _metadata

    if vocab_pkl.exists():
        with open(vocab_pkl, "rb") as f:
            _vocabulary = pickle.load(f)
    elif (_MODELS_DIR / "vocabulary_v2_list.json").exists():
        with open(_MODELS_DIR / "vocabulary_v2_list.json") as f:
            _vocabulary = json.load(f)
    else:
        raise RuntimeError(f"No vocabulary file found in {_MODELS_DIR}")

    _vocab_index = {v: i for i, v in enumerate(_vocabulary)}

    if meta_json.exists():
        with open(meta_json, "r", encoding="utf-8") as f:
            _metadata = json.load(f)
    else:
        _metadata = {}
        log.warning("metadata_v2.json not found — metadata will be empty.")


# ── Accessors ──────────────────────────────────────────────────────────────────

def is_loaded() -> bool:
    """Check if ML models were loaded successfully."""
    return _loaded


def is_onnx() -> bool:
    """Check if models are loaded from ONNX format."""
    return _use_onnx


def get_role_model():
    """Return the role classifier (ONNX session or sklearn model)."""
    assert _loaded, "Models not loaded. Call load_models() first."
    return _role_session


def get_score_model():
    """Return the score regressor (ONNX session or sklearn model)."""
    assert _loaded, "Models not loaded. Call load_models() first."
    return _score_session


def get_label_encoder():
    """Return the fitted LabelEncoder."""
    assert _loaded, "Models not loaded. Call load_models() first."
    return _label_encoder


def get_vocabulary() -> list[str]:
    """Return the sorted skill vocabulary list."""
    assert _loaded, "Models not loaded. Call load_models() first."
    return _vocabulary


def get_vocab_index() -> dict[str, int]:
    """Return the vocabulary → position index dict."""
    assert _loaded, "Models not loaded. Call load_models() first."
    return _vocab_index


def get_metadata() -> dict:
    """Return the v2 metadata dict."""
    assert _loaded, "Models not loaded. Call load_models() first."
    return _metadata
