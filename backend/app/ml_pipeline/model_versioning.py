"""
model_versioning.py — automatic version tracking for ML artefacts.

Maintains a ``model_manifest.json`` in backend/models/ that records every
training run with:
  - version tag (auto-incremented: v1, v2, …)
  - timestamp, dataset size, evaluation metrics
  - artefact filenames
  - active flag (only one version is "current" at any time)

Supports:
  list_versions()        → all historical training runs
  get_active_version()   → the version currently in production
  promote_version(tag)   → set a past version as active (rollback)
  register_version(...)  → called after every train run to record metadata
"""

from __future__ import annotations

import json
import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

_MODELS_DIR   = Path(__file__).resolve().parent.parent.parent / "models"
_MANIFEST     = _MODELS_DIR / "model_manifest.json"
_ARCHIVE_DIR  = _MODELS_DIR / "archive"


# ── helpers ────────────────────────────────────────────────────────────────────

def _ensure_dirs() -> None:
    _MODELS_DIR.mkdir(parents=True, exist_ok=True)
    _ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)


def _load_manifest() -> list[dict]:
    if not _MANIFEST.exists():
        return []
    with open(_MANIFEST, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_manifest(entries: list[dict]) -> None:
    _ensure_dirs()
    with open(_MANIFEST, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2)


def _next_tag(entries: list[dict]) -> str:
    """Auto-increment: v1, v2, v3, …"""
    if not entries:
        return "v1"
    nums = []
    for e in entries:
        tag = e.get("tag", "")
        if tag.startswith("v") and tag[1:].isdigit():
            nums.append(int(tag[1:]))
    return f"v{max(nums, default=0) + 1}"


# ── public API ─────────────────────────────────────────────────────────────────

def register_version(
    *,
    pipeline: str = "v2",
    dataset_size: int,
    real_count: int = 0,
    synthetic_count: int = 0,
    eval_metrics: dict,
    artefacts: list[str],
    hyperparameters: dict | None = None,
    notes: str = "",
) -> dict:
    """
    Record a new training run in the manifest and archive current artefacts.

    Returns the newly created manifest entry.
    """
    _ensure_dirs()
    entries = _load_manifest()
    tag = _next_tag(entries)

    # Archive the artefacts into archive/<tag>/
    archive_dir = _ARCHIVE_DIR / tag
    archive_dir.mkdir(parents=True, exist_ok=True)
    for name in artefacts:
        src = _MODELS_DIR / name
        if src.exists():
            shutil.copy2(src, archive_dir / name)

    # Mark all previous entries as inactive
    for e in entries:
        e["active"] = False

    entry = {
        "tag": tag,
        "pipeline": pipeline,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset_size": dataset_size,
        "real_count": real_count,
        "synthetic_count": synthetic_count,
        "eval_metrics": eval_metrics,
        "artefacts": artefacts,
        "hyperparameters": hyperparameters or {},
        "notes": notes,
        "active": True,
    }
    entries.append(entry)
    _save_manifest(entries)
    logger.info("Registered model version %s (pipeline=%s)", tag, pipeline)
    return entry


def list_versions() -> list[dict]:
    """Return all historical training runs (newest first)."""
    entries = _load_manifest()
    return list(reversed(entries))


def get_active_version() -> dict | None:
    """Return the currently-active model version entry, or None."""
    for e in reversed(_load_manifest()):
        if e.get("active"):
            return e
    return None


def promote_version(tag: str) -> dict:
    """
    Set *tag* as the active version and restore its artefacts.

    Raises ValueError if the tag is not found or archive is missing.
    """
    entries = _load_manifest()
    target = None
    for e in entries:
        if e["tag"] == tag:
            target = e
            break
    if target is None:
        raise ValueError(f"Version '{tag}' not found in manifest")

    archive_dir = _ARCHIVE_DIR / tag
    if not archive_dir.exists():
        raise ValueError(f"Archive for '{tag}' is missing — cannot restore")

    # Copy artefacts from archive back to models/
    for name in target.get("artefacts", []):
        src = archive_dir / name
        if src.exists():
            shutil.copy2(src, _MODELS_DIR / name)
        else:
            logger.warning("Artefact %s missing from archive/%s", name, tag)

    # Update active flags
    for e in entries:
        e["active"] = (e["tag"] == tag)
    _save_manifest(entries)

    logger.info("Promoted model version %s to active", tag)
    return target


def delete_version(tag: str) -> bool:
    """
    Remove a version from the manifest and delete its archive.
    Cannot delete the currently-active version.
    """
    entries = _load_manifest()
    target = None
    for i, e in enumerate(entries):
        if e["tag"] == tag:
            target = (i, e)
            break
    if target is None:
        raise ValueError(f"Version '{tag}' not found")
    idx, entry = target
    if entry.get("active"):
        raise ValueError("Cannot delete the active version — promote another first")

    # Remove archive
    archive_dir = _ARCHIVE_DIR / tag
    if archive_dir.exists():
        shutil.rmtree(archive_dir)

    entries.pop(idx)
    _save_manifest(entries)
    logger.info("Deleted model version %s", tag)
    return True
