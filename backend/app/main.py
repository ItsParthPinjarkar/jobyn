"""
main.py — application entry point.

Startup sequence:
  1. Validate JSON configs (skills/roles/scoring)
  2. Check Supabase connectivity (non-fatal warning)
  3. Load v2 ML models — ONNX preferred, pickle fallback (warning if missing)
  4. Accept requests

Middleware: CORS (explicit origin allowlist)

Routers:
  - analyze.py   → /upload, /roles
  - data.py      → /history, /compare, /analytics, /export
  - ml.py        → /ml/* (Phase 4A similarity / impact)
  - inference.py → /health, /predict  (Phase 4B RandomForest serving)
"""

import os
import sentry_sdk
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config_loader import validate_all
from app.core.supabase_client import check_connection
from app.model_loader import load_models, is_loaded, get_metadata
from app.routers import analyze
from app.routers import data as data_router
from app.routers import ml as ml_router
from app.routers import inference as inference_router
from app.core.rate_limiter import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.settings import settings

# Middleware deps
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# Routers (registered below)
from app.routers import ai_insight
from app.routers import feedback as feedback_router
from app.routers import content_feedback as content_feedback_router
from app.routers import project_generator
from app.routers import quick_score as quick_score_router
from app.routers import assessment as assessment_router
from app.routers import jd_match as jd_match_router
from app.routers import benchmark as benchmark_router
from app.routers import company_prep as company_prep_router
from app.routers import coding as coding_router
from app.routers import onboarding_email as onboarding_email_router
from app.routers import manual_profile as manual_profile_router
from app.routers import resume_builder as resume_builder_router
from app.routers import sandbox as sandbox_router

from app.core.cache import cache as _app_cache

logging.basicConfig(
    level   = logging.INFO,
    format  = "%(asctime)s  %(levelname)-8s  [%(name)s]  %(message)s",
    datefmt = "%H:%M:%S",
)

log = logging.getLogger("main")

# ── Sentry ────────────────────────────────────────────────────────────────────
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=os.getenv("ENV", "development"),
        traces_sample_rate=0.1,
    )

# ---- Env‑var check ----------------------------------------------------------
if not os.getenv("BYTEZ_API_KEY"):
    log.warning("BYTEZ_API_KEY is missing – Bytez-powered features will be unavailable.")


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):

    # 1. Validate config files
    validate_all()

    # 2. Supabase (non-fatal)
    db = check_connection()
    if db["supabase"] == "connected":
        log.info("Supabase connected  %s", db.get("url", ""))
    elif db["supabase"] == "not_configured":
        log.info("Supabase not configured — running in local mode (no database)")
    else:
        log.warning("Supabase %s — %s", db["supabase"], db.get("detail", ""))

    # 3. ML models (non-fatal if missing)
    try:
        load_models()
        log.info("ML inference layer ready.")
    except RuntimeError as e:
        log.warning("ML model load failed: %s", e)
        log.info("Server starting WITHOUT ML inference. Models can be trained later.")

    yield


# ── App factory ────────────────────────────────────────────────────────────────

app = FastAPI(
    title       = "Jobyn — Resume Intelligence API",
    description = (
        "**Resume Intelligence API**\n\n"
        "- **Deterministic scoring** (config-driven)\n"
        "- **ML-powered role prediction** (RandomForest v2)\n\n"
        "Start with `POST /upload` to analyse a resume, "
        "then use `POST /predict` for ML-powered role prediction."
    ),
    version     = settings.APP_VERSION,
    lifespan    = lifespan,
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

# ── Rate limiting ──────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins       = settings.CORS_ORIGINS,
    allow_origin_regex   = r"http://(localhost|127\.0\.0\.1):(517[3-9]|518[0-5])",
    allow_credentials   = True,
    allow_methods       = ["*"],
    allow_headers       = ["*"],
)

# ── Request Body Size Limit Middleware ────────────────────────────────────
class LimitUploadSize(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "POST":
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > 10_000_000:  # 10MB
                return JSONResponse(status_code=413, content={"detail": "Request too large"})
        return await call_next(request)

app.add_middleware(LimitUploadSize)

# ── HTTP Response Security Headers Middleware ────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# ── App factory ────────────────────────────────────────────────────────────────
# ... (rest of App factory)
app.include_router(analyze.router)
app.include_router(data_router.router)
app.include_router(ml_router.router)
app.include_router(inference_router.router)
app.include_router(ai_insight.router)
app.include_router(feedback_router.router)
app.include_router(content_feedback_router.router)
app.include_router(project_generator.router)
app.include_router(quick_score_router.router)
app.include_router(assessment_router.router)
app.include_router(jd_match_router.router)
app.include_router(benchmark_router.router)
app.include_router(company_prep_router.router)
app.include_router(coding_router.router)
app.include_router(onboarding_email_router.router)
app.include_router(manual_profile_router.router)
app.include_router(resume_builder_router.router)
app.include_router(sandbox_router.router)


# ── Root ────────────────────────────────────────────────────────────────────────

@app.api_route("/", methods=["GET", "HEAD"], tags=["Status"], summary="Service root status")
def root():
    db = _app_cache.get("root:db_status")
    if db is None:
        db = check_connection()
        _app_cache.set("root:db_status", db, ttl=30)
    meta = get_metadata() if is_loaded() else {}
    return {
        "status":        "Resume Intelligence API Running",
        "version":       settings.APP_VERSION,
        "model_version": meta.get("version", "not_loaded"),
        "model_accuracy": f"{meta.get('accuracy', 0)*100:.1f}%" if meta else "N/A",
        "database":      db["supabase"],
        "cache_backend": _app_cache.backend,
        "docs":          "/docs",
    }
