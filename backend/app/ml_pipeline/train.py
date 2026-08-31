"""
train.py — orchestrates the full training pipeline for v1.0 production models.

Usage:
    python -m app.ml_pipeline.train
    python -m app.ml_pipeline.train --seed 42

Steps:
  1. Load combined dataset (real + synthetic)
  2. Engineer features
  3. 80/20 stratified split
  4. Train RandomForestClassifier (role) + RandomForestRegressor (score)
  5. Evaluate on held-out test set
  6. Save models, vocabulary, and metadata

Outputs:
    backend/models/role_model_v1.pkl
    backend/models/score_model_v1.pkl
    backend/models/vocabulary_v1.pkl
    backend/models/metadata_v1.json
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

from app.ml_pipeline.data_loader        import load_combined_dataset
from app.ml_pipeline.feature_engineering import engineer_features
from app.ml_pipeline.evaluation         import full_evaluation, print_evaluation_report
from app.ml_pipeline.model_registry     import save_trained_models

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level  = logging.INFO,
    format = "%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt= "%H:%M:%S",
)
log = logging.getLogger("train")

# ── Hyperparameters ────────────────────────────────────────────────────────────
N_ESTIMATORS = 200
TEST_SIZE    = 0.20


# ── Pipeline ───────────────────────────────────────────────────────────────────

def run(seed: int = 42) -> dict:
    """
    Execute the full training pipeline.

    Args:
        seed: Random seed for reproducibility.

    Returns:
        metadata dict (same as saved to metadata_v1.json).
    """
    t0 = time.time()
    log.info("═" * 55)
    log.info("  JOBYN — Model Training v1.0")
    log.info("═" * 55)

    # ── 1. Load data ─────────────────────────────────────────────────────────
    log.info("Step 1/5 — Loading dataset from Supabase …")
    records = load_combined_dataset()
    if not records:
        log.error("No data found. Upload resumes or run synthetic generator first.")
        sys.exit(1)
    log.info(f"  Loaded {len(records)} records.")

    # ── 2. Feature engineering ────────────────────────────────────────────────
    log.info("Step 2/5 — Engineering features …")
    X_list, y_role, y_score, weights, vocab = engineer_features(records)

    X       = np.array(X_list,  dtype=np.float32)
    y_role  = np.array(y_role)
    y_score = np.array(y_score, dtype=np.float32)
    weights = np.array(weights, dtype=np.float32)

    # Encode role labels
    le            = LabelEncoder()
    y_role_enc    = le.fit_transform(y_role)
    log.info(f"  Roles ({len(le.classes_)}): {list(le.classes_)}")
    log.info(f"  Feature dim: {X.shape[1]}  ({len(vocab)} skills + 5 numeric)")

    # ── 3. Train / test split (stratified by role) ────────────────────────────
    log.info(f"Step 3/5 — Splitting 80/20 (stratified, seed={seed}) …")
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
    log.info(f"Step 4/5 — Training RandomForest models (n_estimators={N_ESTIMATORS}) …")

    log.info("  Training RoleClassifier …")
    clf = RandomForestClassifier(
        n_estimators = N_ESTIMATORS,
        class_weight = "balanced",
        random_state = seed,
        n_jobs       = -1,
    )
    clf.fit(X_train, yr_train, sample_weight=w_train)
    log.info("  RoleClassifier trained.")

    log.info("  Training ScoreRegressor …")
    reg = RandomForestRegressor(
        n_estimators = N_ESTIMATORS,
        random_state = seed,
        n_jobs       = -1,
    )
    reg.fit(X_train, ys_train, sample_weight=w_train)
    log.info("  ScoreRegressor trained.")

    # ── 5. Evaluate ───────────────────────────────────────────────────────────
    log.info("Step 5/5 — Evaluating on test set …")
    metrics = full_evaluation(clf, reg, le, X_test, yr_test, ys_test)
    print_evaluation_report(metrics)

    # ── 6. Save ───────────────────────────────────────────────────────────────
    log.info("Saving models …")
    metadata = save_trained_models(
        clf          = clf,
        reg          = reg,
        le           = le,
        vocab        = vocab,
        eval_metrics = metrics,
        dataset_size = len(records),
        seed         = seed,
    )

    elapsed = round(time.time() - t0, 1)
    log.info(f"✅  Training complete in {elapsed}s")
    log.info(f"    Role accuracy : {metrics['classifier']['accuracy']*100:.1f}%")
    log.info(f"    Score RMSE    : {metrics['regressor']['rmse']:.2f}")
    log.info(f"    Score R²      : {metrics['regressor']['r2']:.4f}")

    return metadata


# ── CLI ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Train Jobyn ML models v1.0"
    )
    parser.add_argument(
        "--seed", type=int, default=42,
        help="Random seed for reproducibility (default: 42)"
    )
    args = parser.parse_args()
    run(seed=args.seed)
