"""
fetch_models.py — download prebuilt v2 ML artefacts at deploy time.

Replaces on-deploy training (train_v2 + convert_to_onnx). The models are
trained locally and uploaded once to a GitHub Release; this script pulls the
ONNX/pickle artefacts into backend/models/ during the build so model_loader.py
finds them at startup.

Why not train on deploy:
  - The training data lives only in Supabase (load_combined_dataset_v2); a dead
    or unreachable project makes training impossible.
  - The trained RandomForest pickles are ~200 MB and OOM on small instances.
  - role_model_v2.onnx (~129 MB) exceeds GitHub's 100 MB file limit, so it
    can't be committed to the repo — but Release assets have no such limit.

Idempotent: skips any artefact that already exists and is non-empty, so it is
safe to re-run locally and cheap on cached Render builds.

Usage:
    python -m app.scripts.fetch_models

Config (env vars, optional):
    MODELS_BASE_URL  Base URL to download from (default: the GitHub Release below)
"""

from __future__ import annotations

import logging
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-8s  %(message)s")
log = logging.getLogger("fetch_models")

_MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"

# GitHub Release that hosts the prebuilt artefacts. Override with MODELS_BASE_URL.
_DEFAULT_BASE_URL = (
    "https://github.com/Ganesh-0509/Jobyn/releases/download/models-v2"
)
_BASE_URL = os.getenv("MODELS_BASE_URL", _DEFAULT_BASE_URL).rstrip("/")

# Artefacts required by model_loader.py's ONNX fast path. The two .onnx files
# are the inference models; the rest are tiny and needed to decode/feature-map.
_ARTEFACTS = [
    "role_model_v2.onnx",
    "score_model_v2.onnx",
    "label_encoder_v2.pkl",
    "vocabulary_v2.pkl",
    "metadata_v2.json",
]

_MAX_RETRIES = 3
_RETRY_BACKOFF_S = 3


def _remote_size(url: str) -> int | None:
    """Return the Content-Length of a remote asset, or None if unknown."""
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=30) as resp:
            cl = resp.headers.get("Content-Length")
            return int(cl) if cl is not None else None
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        return None


def _download(url: str, dest: Path) -> None:
    """Stream a URL to disk (no full-file buffering) with retries."""
    tmp = dest.with_suffix(dest.suffix + ".part")
    last_err: Exception | None = None

    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            with urllib.request.urlopen(url, timeout=60) as resp, open(tmp, "wb") as out:
                while True:
                    chunk = resp.read(1 << 20)  # 1 MiB
                    if not chunk:
                        break
                    out.write(chunk)
            tmp.replace(dest)
            return
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            last_err = e
            log.warning("  attempt %d/%d failed: %s", attempt, _MAX_RETRIES, e)
            if attempt < _MAX_RETRIES:
                time.sleep(_RETRY_BACKOFF_S * attempt)
        finally:
            if tmp.exists():
                tmp.unlink(missing_ok=True)

    raise RuntimeError(f"Failed to download {url} after {_MAX_RETRIES} attempts: {last_err}")


def fetch() -> None:
    _MODELS_DIR.mkdir(parents=True, exist_ok=True)
    log.info("Fetching ML artefacts into %s", _MODELS_DIR)
    log.info("Source: %s", _BASE_URL)

    for name in _ARTEFACTS:
        dest = _MODELS_DIR / name
        url = f"{_BASE_URL}/{name}"

        # Skip only if a local copy already matches the remote size. Comparing
        # against the remote Content-Length (not just "exists") means a stale
        # build cache holding an old/larger model is re-fetched, not kept.
        if dest.exists() and dest.stat().st_size > 0:
            remote = _remote_size(url)
            local = dest.stat().st_size
            if remote is None or remote == local:
                log.info("  ✓ %s already present (%.1f MB) — skipping",
                         name, local / 1e6)
                continue
            log.info("  ↻ %s size mismatch (local %.1f MB vs remote %.1f MB) — refetching",
                     name, local / 1e6, remote / 1e6)

        log.info("  ↓ %s", url)
        _download(url, dest)
        log.info("    saved %s (%.1f MB)", name, dest.stat().st_size / 1e6)

    log.info("All artefacts ready — model_loader will use the ONNX fast path.")


if __name__ == "__main__":
    try:
        fetch()
    except Exception as e:  # noqa: BLE001 — build must fail loudly, not silently
        log.error("Model fetch failed: %s", e)
        sys.exit(1)
