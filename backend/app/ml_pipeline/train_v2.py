"""
train_v2.py — training pipeline for v2.0 production models.

Key differences from train.py (v1):
  - Loads real + resume_analysis_synthetic_v2 ONLY (v1 synthetic ignored)
  - n_estimators=300, max_depth=20, min_samples_leaf=3
  - Saves to role_model_v2.pkl / score_model_v2.pkl / vocabulary_v2.pkl
  - metadata_v2.json follows the exact spec format

V1 artefacts are NEVER modified.

Usage:
    python -m app.ml_pipeline.train_v2
    python -m app.ml_pipeline.train_v2 --seed 42
"""

from __future__ import annotations
import argparse
import logging
import sys
import time

import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

from app.ml_pipeline.data_loader        import load_combined_dataset_v2
from app.ml_pipeline.feature_engineering import engineer_features
from app.ml_pipeline.evaluation          import full_evaluation, print_evaluation_report
from app.ml_pipeline.model_registry      import save_trained_models_v2

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level   = logging.INFO,
    format  = "%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt = "%H:%M:%S",
)
log = logging.getLogger("train_v2")

# ── Hyperparameters (v2) ───────────────────────────────────────────────────────
# Defaults tuned to keep the exported ONNX models small enough to load on a
# 512 MB instance (Render free tier). The original full-size config (300 trees /
# depth 20) produced a ~129 MB role ONNX that OOM'd on load; 80 trees / depth 12
# brings that to ~25 MB at a ~1-3% accuracy cost. Override via CLI for a beefier
# instance: --n-estimators 300 --max-depth 20.
HYPERPARAMS = {
    "n_estimators":    80,
    "max_depth":       12,
    "min_samples_leaf": 3,
}
TEST_SIZE = 0.20


# ── Pipeline ───────────────────────────────────────────────────────────────────

def run(seed: int = 42) -> dict:
    """
    Execute the full v2 training pipeline.

    Returns:
        metadata dict (same as saved to metadata_v2.json).
    """
    t0 = time.time()
    log.info("=" * 60)
    log.info("  JOBYN — Model Training v2.0")
    log.info(f"  Hyperparams: n_estimators={HYPERPARAMS['n_estimators']}, "
             f"max_depth={HYPERPARAMS['max_depth']}, "
             f"min_samples_leaf={HYPERPARAMS['min_samples_leaf']}")
    log.info("=" * 60)

    # ── 1. Load data ─────────────────────────────────────────────────────────
    log.info("Step 1/5 — Loading dataset (real + synthetic_v2) …")
    records = load_combined_dataset_v2()

    if not records:
        log.error(
            "No data found. Make sure:\n"
            "  1. Real resumes uploaded via /upload\n"
            "  2. Synthetic v2 generated:  python -m synthetic_data.generate_synthetic_dataset_v2 --count 2000"
        )
        sys.exit(1)

    real_count  = sum(1 for r in records if r["sample_weight"] > 1.0)
    synth_count = len(records) - real_count
    log.info(f"  Real: {real_count}  |  Synthetic v2: {synth_count}  |  Total: {len(records)}")

    # ── 2. Feature engineering ────────────────────────────────────────────────
    log.info("Step 2/5 — Engineering features …")
    X_list, y_role, y_score, weights, vocab = engineer_features(records)

    X       = np.array(X_list,  dtype=np.float32)
    y_role  = np.array(y_role)
    y_score = np.array(y_score, dtype=np.float32)
    weights = np.array(weights, dtype=np.float32)

    le         = LabelEncoder()
    y_role_enc = le.fit_transform(y_role)

    log.info(f"  Roles ({len(le.classes_)}): {list(le.classes_)}")
    log.info(f"  Feature vector size: {X.shape[1]}  ({len(vocab)} skills + 5 numeric)")

    # ── 3. Stratified 80/20 split ─────────────────────────────────────────────
    log.info(f"Step 3/5 — Stratified 80/20 split (random_state={seed}) …")
    (X_train, X_test,
     yr_train, yr_test,
     ys_train, ys_test,
     w_train,  _) = train_test_split(
        X, y_role_enc, y_score, weights,
        test_size    = TEST_SIZE,
        random_state = seed,
        stratify     = y_role_enc,
    )
    log.info(f"  Train: {len(X_train)}  |  Test: {len(X_test)}")

    # ── 4. Train models ───────────────────────────────────────────────────────
    log.info("Step 4/5 — Training RandomForest models v2 …")

    log.info("  [4a] RoleClassifier (n_estimators=300, max_depth=20, min_samples_leaf=3, class_weight=balanced) …")
    clf = RandomForestClassifier(
        n_estimators    = HYPERPARAMS["n_estimators"],
        max_depth       = HYPERPARAMS["max_depth"],
        min_samples_leaf= HYPERPARAMS["min_samples_leaf"],
        class_weight    = "balanced",
        random_state    = seed,
        n_jobs          = -1,
    )
    clf.fit(X_train, yr_train, sample_weight=w_train)
    log.info("  RoleClassifier v2 trained.")

    log.info("  [4b] ScoreRegressor (n_estimators=300, max_depth=20, min_samples_leaf=3) …")
    reg = RandomForestRegressor(
        n_estimators    = HYPERPARAMS["n_estimators"],
        max_depth       = HYPERPARAMS["max_depth"],
        min_samples_leaf= HYPERPARAMS["min_samples_leaf"],
        random_state    = seed,
        n_jobs          = -1,
    )
    reg.fit(X_train, ys_train, sample_weight=w_train)
    log.info("  ScoreRegressor v2 trained.")

    # ── 5. Evaluate ───────────────────────────────────────────────────────────
    log.info("Step 5/5 — Evaluating on held-out test set …")
    metrics = full_evaluation(clf, reg, le, X_test, yr_test, ys_test)
    print_evaluation_report(metrics)

    # ── 6. Save (v1 artefacts untouched) ─────────────────────────────────────
    log.info("Saving v2 artefacts …")
    metadata = save_trained_models_v2(
        clf             = clf,
        reg             = reg,
        le              = le,
        vocab           = vocab,
        eval_metrics    = metrics,
        real_count      = real_count,
        synthetic_count = synth_count,
        seed            = seed,
    )

    elapsed = round(time.time() - t0, 1)
    log.info("=" * 60)
    log.info(f"  Training complete in {elapsed}s")
    log.info(f"  Role Accuracy : {metrics['classifier']['accuracy']*100:.1f}%")
    log.info(f"  F1 Macro      : {metrics['classifier']['f1_macro']:.4f}")
    log.info(f"  Score RMSE    : {metrics['regressor']['rmse']:.2f}")
    log.info(f"  Score R2      : {metrics['regressor']['r2']:.4f}")
    log.info("=" * 60)

    return metadata


# ── CLI ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Train Jobyn ML models v2.0 (synthetic_v2 dataset)"
    )
    parser.add_argument(
        "--seed", type=int, default=42,
        help="Random seed for reproducibility (default: 42)"
    )
    parser.add_argument(
        "--n-estimators", type=int, default=HYPERPARAMS["n_estimators"],
        help=f"Number of trees (default: {HYPERPARAMS['n_estimators']})"
    )
    parser.add_argument(
        "--max-depth", type=int, default=HYPERPARAMS["max_depth"],
        help=f"Max tree depth (default: {HYPERPARAMS['max_depth']})"
    )
    args = parser.parse_args()
    HYPERPARAMS["n_estimators"] = args.n_estimators
    HYPERPARAMS["max_depth"] = args.max_depth
    run(seed=args.seed)
