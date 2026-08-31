
"""
settings.py — centralised configuration via environment variables.

Every tuneable value that was previously hardcoded (model names, rate limits,
TTLs, CORS origins, version strings, etc.) is loaded here from env vars with
sensible defaults.  Import the module-level ``settings`` singleton wherever
you need a value:

    from app.core.settings import settings

    model = settings.GEMINI_MODEL
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend root
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")


class Settings:
    """Read-once, attribute-access configuration bag."""

    # ── App ─────────────────────────────────────────────────────────
    APP_VERSION: str          = os.getenv("APP_VERSION", "4.2.0")

    # ── CORS ────────────────────────────────────────────────────────
    # Comma-separated origins.  Example: "http://localhost:5173,https://getjobyn.pages.dev"
    CORS_ORIGINS: list[str]   = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if o.strip()
    ]

    # ── Rate limits ─────────────────────────────────────────────────
    RATE_LIMIT_DEFAULT: str   = os.getenv("RATE_LIMIT_DEFAULT", "60/minute")
    RATE_LIMIT_UPLOAD: str    = os.getenv("RATE_LIMIT_UPLOAD",  "10/minute")
    RATE_LIMIT_AI: str        = os.getenv("RATE_LIMIT_AI",      "20/minute")
    RATE_LIMIT_HEAVY: str     = os.getenv("RATE_LIMIT_HEAVY",   "30/minute")

    # ── File upload ─────────────────────────────────────────────────
    MAX_UPLOAD_BYTES: int     = int(os.getenv("MAX_UPLOAD_BYTES", "5000000"))

    # ── AI / LLM models ────────────────────────────────────────────
    GEMINI_MODEL: str              = os.getenv("GEMINI_MODEL",           "gemini-2.0-flash")
    GEMINI_EMBEDDING_MODEL: str    = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
    BYTEZ_MODEL: str               = os.getenv("BYTEZ_MODEL",           "google/gemini-2.5-flash-lite")

    # ── Cache TTLs (seconds) ───────────────────────────────────────
    FORECAST_CACHE_TTL: int   = int(os.getenv("FORECAST_CACHE_TTL", "3600"))
    RAG_CACHE_TTL: int        = int(os.getenv("RAG_CACHE_TTL",      "86400"))
    DATASET_CACHE_TTL: int    = int(os.getenv("DATASET_CACHE_TTL",  "300"))

    # ── Curriculum ──────────────────────────────────────────────────
    MIN_QUIZ_UNLOCK_SCORE: float = float(os.getenv("MIN_QUIZ_UNLOCK_SCORE", "70.0"))

    # ── Admin ───────────────────────────────────────────────────────
    # Admin is no longer an email allowlist. It is a verified Supabase
    # `app_metadata.role == 'admin'` claim (set only via the service key /
    # dashboard, never user-modifiable) — see app/core/auth.py get_admin_user.


settings = Settings()
