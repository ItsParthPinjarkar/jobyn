# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Jobyn is an AI career-readiness platform for engineering students: upload a resume, get ML + deterministic scoring across job roles, dependency-aware study plans, a RAG-backed AI tutor, voice mock interviews, and GitHub project verification. Monorepo with a `frontend/` (React SPA) and `backend/` (FastAPI + ML).

## Commands

The CI workflow (`.github/workflows/*.yml`) is the source of truth for the canonical commands. Frontend commands run from `frontend/`, backend commands from `backend/`.

### Frontend (`cd frontend`)
- Install: `npm ci`
- Dev server: `npm run dev` (port 5173; `predev` copies ONNX assets into `public/`)
- Typecheck: `npx tsc --noEmit`
- Tests: `npx vitest run`
- Single test file: `npx vitest run src/test/<file>.test.ts`
- Single test by name: `npx vitest run -t "<test name>"`
- Build: `npm run build` (`tsc && vite build`, then `postbuild` prerenders public pages + optimizes images)

### Backend (`cd backend`)
- Install: `pip install -r requirements.txt` (use a **Python 3.12** venv — see Gotchas)
- Run server: `uvicorn app.main:app --reload`
- Lint: `ruff check app/ --select E,F,W --ignore E501`
- Tests: `python -m pytest tests/ -v --tb=short`
- Single test: `python -m pytest tests/test_auth.py::test_name -v`
- Train + export models (normally done on deploy): `python -m app.ml_pipeline.train_v2 --seed 42 && python -m app.scripts.convert_to_onnx`

## Architecture

### Backend — config-driven, fallback-everywhere FastAPI
- `app/main.py` builds the FastAPI app and mounts ~19 routers (`app/routers/`). Request flow: **router → service (`app/services/`) → core (`app/core/`)**. Routers are thin; business logic lives in services.
- **Config-driven core.** Skills, roles, and scoring weights are JSON in `config/` (`skills.json`, `roles.json`, `scoring.json`), loaded by `core/config_loader.py`, which **cross-validates** that every skill referenced in `roles.json` exists in `skills.json`. Change behavior by editing the JSON, not hardcoding.
- **Graceful-degradation chains** are a deliberate, repeated pattern — preserve them when editing:
  - LLM: Gemini (`gemini_service`) → Bytez (`bytez_service`) → rule-based templates
  - Cache (`core/cache.py`): Redis → Supabase → in-memory dict
  - ML inference: ONNX → sklearn pickle
  - Skill matching (`skill_dictionary.py`): exact → fuzzy (Levenshtein ≤ 2)
- **RAG** (`rag_service.py`): query → Gemini embedding → PGVector cosine search (`match_knowledge` RPC) → Gemini generation → judge validation → cache.
- **Auth** (`core/auth.py`): Supabase JWT verified per-request (asymmetric ES256/RS256 via JWKS; legacy HS256 fallback), three tiers (public / required / admin). Every user-data endpoint does an ownership check (IDOR prevention) against the authenticated user's email.
- **ML pipeline** (`app/ml_pipeline/`, `predictor.py`): RandomForest classifier (role) + regressor (score) on a 152-dim feature vector (147 binary skill flags + 5 normalized numeric scores). The vocabulary order is shared between server inference and browser ONNX, so it must stay stable.

### Frontend — React SPA with browser-side ML
- `src/main.tsx` → `src/App.tsx`. Pages in `src/pages/` are lazy-loaded with auth guards and feature-flag filtering (`src/config/`).
- **State via React Context** (`src/context/`): `AuthContext`, `ResumeContext`, `ToastContext`, `PrivacyContext`, backed by user-scoped localStorage keys.
- **All backend calls go through `src/api/client.ts`** — add new API calls there, not ad-hoc `fetch`.
- **Browser-side ML (privacy mode):** `onnxruntime-web` runs `*_v2.onnx` in WASM, rebuilding the same feature vector as the server. ONNX assets are copied into `public/` by `scripts/copy-onnx-assets.js` (pre-dev/pre-build).

### Data layer
Supabase (PostgreSQL 15) — schema in `backend/COMPLETE_SCHEMA.sql` / `supabase_schema.sql`, RLS policies in `supabase-rls-policies.sql`. PGVector for 3072-dim embeddings. Most tables use `user_email` as a logical foreign key (no formal FK). **No migration tool** — schema changes are raw SQL applied manually.

## Gotchas
- **Python version: 3.12 everywhere.** `Dockerfile` (`python:3.12-slim`), `render.yaml` (`PYTHON_VERSION 3.12.8`), and CI all pin 3.12. The local machine's global Python may be newer (3.14) — use a 3.12 venv to match deploy.
- **Trained models are gitignored**, not in the repo (`backend/models/*.pkl`, `*.onnx` exceed GitHub's 100MB limit). They're trained on deploy via `render.yaml`'s build command. Run the train/export commands above to regenerate locally.
- **Auth tests need `SUPABASE_JWT_SECRET`** in the environment (loaded from `.env` by `conftest.py`); without it, JWT-signing fixtures produce invalid tokens.
- **Redis is optional** — absence logs a warning and falls back to in-memory cache. Not an error.
- **Deployment:** Render Blueprint (`render.yaml`, primary) builds both services; Docker Compose (`docker-compose.yml`) is secondary. Env vars are `sync: false` (set manually in the Render dashboard).

## Note on docs
`README.md` and `docs/` are thorough but lag the code (they say "9 routers / 48 endpoints" — the app now has 19 routers / 79 routes, and trained models are gitignored, not committed). Trust the code over those docs when they conflict.
