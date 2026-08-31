"""
convert_to_onnx.py — Convert trained sklearn models to ONNX format.

ONNX files are ~10x smaller than pickle and can be committed to git.
Also updates vocabulary_v2_list.json for browser-side inference.

Usage:
    python -m app.scripts.convert_to_onnx
"""

import json
import pickle
import logging
from pathlib import Path

import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-8s  %(message)s")
log = logging.getLogger("convert_onnx")

_MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"


def convert():
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType

    # ── Load pickle artifacts ──────────────────────────────────────────────
    log.info("Loading v2 pickle models from %s", _MODELS_DIR)

    with open(_MODELS_DIR / "role_model_v2.pkl", "rb") as f:
        role_data = pickle.load(f)
    clf = role_data["model"]
    label_encoder = role_data["label_encoder"]

    with open(_MODELS_DIR / "score_model_v2.pkl", "rb") as f:
        reg = pickle.load(f)

    with open(_MODELS_DIR / "vocabulary_v2.pkl", "rb") as f:
        vocab = pickle.load(f)

    n_features = len(vocab) + 5  # binary skills + 5 numeric
    log.info("Vocabulary: %d skills, %d total features", len(vocab), n_features)

    initial_type = [("float_input", FloatTensorType([None, n_features]))]

    # ── Convert role classifier ────────────────────────────────────────────
    log.info("Converting role classifier to ONNX...")
    role_onnx = convert_sklearn(
        clf,
        initial_types=initial_type,
        target_opset=15,
        options={id(clf): {"zipmap": False}},  # return raw probabilities
    )
    role_path = _MODELS_DIR / "role_model_v2.onnx"
    with open(role_path, "wb") as f:
        f.write(role_onnx.SerializeToString())
    log.info("Saved role model: %s (%.1f MB)", role_path, role_path.stat().st_size / 1e6)

    # ── Convert score regressor ────────────────────────────────────────────
    log.info("Converting score regressor to ONNX...")
    score_onnx = convert_sklearn(
        reg,
        initial_types=initial_type,
        target_opset=15,
    )
    score_path = _MODELS_DIR / "score_model_v2.onnx"
    with open(score_path, "wb") as f:
        f.write(score_onnx.SerializeToString())
    log.info("Saved score model: %s (%.1f MB)", score_path, score_path.stat().st_size / 1e6)

    # ── Save label encoder as separate tiny pickle ─────────────────────────
    le_path = _MODELS_DIR / "label_encoder_v2.pkl"
    with open(le_path, "wb") as f:
        pickle.dump(label_encoder, f)
    log.info("Saved label encoder: %s (%.1f KB)", le_path, le_path.stat().st_size / 1e3)

    # ── Save vocabulary as JSON (for browser-side inference) ───────────────
    vocab_json_path = _MODELS_DIR / "vocabulary_v2_list.json"
    with open(vocab_json_path, "w") as f:
        json.dump(vocab, f)
    log.info("Saved vocabulary JSON: %s", vocab_json_path)

    # ── Verify ONNX models load correctly ──────────────────────────────────
    import onnxruntime as ort

    sess_role = ort.InferenceSession(str(role_path))
    sess_score = ort.InferenceSession(str(score_path))

    test_input = np.zeros((1, n_features), dtype=np.float32)
    role_out = sess_role.run(None, {"float_input": test_input})
    score_out = sess_score.run(None, {"float_input": test_input})

    log.info("Role model test: classes=%s, prob shape=%s", role_out[0].shape, role_out[1].shape)
    log.info("Score model test: prediction=%s", score_out[0])

    total_onnx = role_path.stat().st_size + score_path.stat().st_size
    total_pkl = (_MODELS_DIR / "role_model_v2.pkl").stat().st_size + (_MODELS_DIR / "score_model_v2.pkl").stat().st_size
    log.info("Size reduction: %.1f MB (pickle) → %.1f MB (ONNX) = %.1fx smaller",
             total_pkl / 1e6, total_onnx / 1e6, total_pkl / total_onnx)
    log.info("DONE — ONNX models are ready for deployment.")


if __name__ == "__main__":
    convert()
