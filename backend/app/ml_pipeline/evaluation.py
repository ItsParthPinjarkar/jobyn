"""
evaluation.py — model evaluation metrics.

Computes:
  Classifier: accuracy, F1-macro, confusion matrix (with class labels)
  Regressor:  RMSE, R²

All outputs are JSON-serialisable (Python floats / lists, no numpy types).
"""

from __future__ import annotations
import math

from sklearn.metrics import (
    accuracy_score,
    f1_score,
    confusion_matrix,
    mean_squared_error,
    r2_score,
)
from sklearn.preprocessing import LabelEncoder
import numpy as np


def evaluate_classifier(
    clf: object,
    le:  LabelEncoder,
    X_test:      np.ndarray,
    y_role_test: np.ndarray,
) -> dict:
    """Return accuracy, F1-macro, and confusion matrix for the role classifier."""
    y_pred = clf.predict(X_test)

    acc = float(accuracy_score(y_role_test, y_pred))
    f1  = float(f1_score(y_role_test, y_pred, average="macro", zero_division=0))
    cm  = confusion_matrix(y_role_test, y_pred).tolist()

    return {
        "accuracy":         round(acc, 4),
        "f1_macro":         round(f1,  4),
        "confusion_matrix": cm,
        "class_labels":     list(le.classes_),
    }


def evaluate_regressor(
    reg:          object,
    X_test:       np.ndarray,
    y_score_test: np.ndarray,
) -> dict:
    """Return RMSE and R² for the score regressor."""
    y_pred = reg.predict(X_test)

    rmse = math.sqrt(float(mean_squared_error(y_score_test, y_pred)))
    r2   = float(r2_score(y_score_test, y_pred))

    return {
        "rmse": round(rmse, 4),
        "r2":   round(r2,   4),
    }


def full_evaluation(
    clf:          object,
    reg:          object,
    le:           LabelEncoder,
    X_test:       np.ndarray,
    y_role_test:  np.ndarray,
    y_score_test: np.ndarray,
) -> dict:
    """Run both evaluations and return a combined metrics dict."""
    clf_metrics = evaluate_classifier(clf, le, X_test, y_role_test)
    reg_metrics = evaluate_regressor(reg, X_test, y_score_test)

    return {
        "classifier": clf_metrics,
        "regressor":  reg_metrics,
    }


def print_evaluation_report(metrics: dict) -> None:
    """Pretty-print evaluation results to stdout."""
    clf = metrics["classifier"]
    reg = metrics["regressor"]

    print("\n" + "=" * 50)
    print("  MODEL EVALUATION REPORT")
    print("=" * 50)
    print("\n  Role Classifier (RandomForest)")
    print(f"    Accuracy  : {clf['accuracy']:.4f}  ({clf['accuracy']*100:.1f}%)")
    print(f"    F1 Macro  : {clf['f1_macro']:.4f}")
    print(f"\n    Roles     : {clf['class_labels']}")
    print("\n    Confusion Matrix:")
    labels = clf["class_labels"]
    header = f"{'':>20} " + "  ".join(f"{lbl[:8]:>8}" for lbl in labels)
    print(f"    {header}")
    for i, row in enumerate(clf["confusion_matrix"]):
        row_str = "  ".join(f"{v:>8}" for v in row)
        print(f"    {labels[i][:20]:>20} {row_str}")

    print("\n  Score Regressor (RandomForest)")
    print(f"    RMSE      : {reg['rmse']:.4f}")
    print(f"    R²        : {reg['r2']:.4f}")
    print("=" * 50 + "\n")
