# Deployment Guide — Jobyn

## Prerequisites

- **Supabase** project ([supabase.com](https://supabase.com/)) — free tier works
- **Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))
- **Bytez API Key** (optional — [bytez.com](https://bytez.com/))
- **Redis** (optional — for caching)
- **GitHub account** (for deployment)

---

## Option 1: Render (Recommended)

### Step 1: Fork & Push

```bash
git clone https://github.com/Ganesh-0509/Jobyn.git
cd Jobyn
```

### Step 2: Create Render Blueprint

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. **New** → **Blueprint** → Connect your GitHub repo
3. Render reads `render.yaml` and auto-creates two services:
   - `jobyn-api` — Python web service
   - `jobyn` — Static site

### Step 3: Set Environment Variables

In the Render dashboard, set these for the API service:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Your Supabase service role key |
| `SUPABASE_JWT_SECRET` | Your Supabase JWT secret |
| `GEMINI_API_KEY` | Your Gemini API key |
| `BYTEZ_API_KEY` | Your Bytez key (optional) |
| `REDIS_URL` | Your Redis URL (optional) |
| `CORS_ORIGINS` | Your frontend domain |

For the static site:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your API service URL |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

### Step 4: Database Setup

1. Go to Supabase Dashboard → SQL Editor
2. Copy and execute `backend/supabase_schema.sql`
3. This creates all 12 tables, indexes, and the PGVector extension

### Step 5: Train ML Models

After the API service is running, SSH into it and run:

```bash
python -m app.ml_pipeline.train_v2 --seed 42
```

Or trigger via API (admin only):

```bash
curl -X POST https://your-api.onrender.com/ml/recompute-model \
  -H "Authorization: Bearer <admin-token>"
```

### Step 6: Seed Content (Optional)

```bash
python -m app.scripts.seed_content --dry-run  # Preview
python -m app.scripts.seed_content             # Execute
```

---

## Option 2: Docker

### Step 1: Build & Run

```bash
docker-compose up --build
```

This starts:
- **Backend**: http://localhost:8000 (FastAPI + Uvicorn)
- **Frontend**: http://localhost:3000 (Nginx serving Vite build)

### Step 2: Environment Variables

Create `backend/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-gemini-key
BYTEZ_API_KEY=your-bytez-key
REDIS_URL=redis://redis:6379
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Step 3: Database & ML Setup

Same as Render steps 4-5 above.

---

## Option 3: Local Development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# Create .env file (see above)

# Run database schema in Supabase SQL Editor

# Train ML models
python -m app.ml_pipeline.train_v2 --seed 42

# Start server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install

# Create .env file (see above)

npm run dev
```

Open http://localhost:5173

---

## Environment Variables Reference

### Backend

| Variable | Required | Default | Description |
|---|---|---|---|
| `SUPABASE_URL` | Yes | — | Supabase project URL |
| `SUPABASE_KEY` | Yes | — | Supabase service role key |
| `SUPABASE_JWT_SECRET` | Yes | — | JWT secret for auth verification |
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key |
| `BYTEZ_API_KEY` | No | — | Bytez SDK key (LLM fallback) |
| `REDIS_URL` | No | — | Redis connection URL |
| `GITHUB_TOKEN` | No | — | GitHub PAT for higher API rate limits |
| `CORS_ORIGINS` | No | `localhost:5173` | Comma-separated allowed origins |
| `APP_VERSION` | No | `4.2.0` | Version string |
| `SENTRY_DSN` | No | — | Sentry error monitoring DSN |
| `RESUME_ENCRYPTION_KEY` | No | — | Fernet key for AES encryption |
| `MAX_UPLOAD_BYTES` | No | `5000000` | Max file upload size (bytes) |
| `RATE_LIMIT_DEFAULT` | No | `60/minute` | General rate limit |
| `RATE_LIMIT_UPLOAD` | No | `10/minute` | Upload rate limit |
| `RATE_LIMIT_AI` | No | `20/minute` | AI endpoint rate limit |
| `RATE_LIMIT_HEAVY` | No | `30/minute` | Heavy endpoint rate limit |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | Gemini model name |
| `GEMINI_EMBEDDING_MODEL` | No | `gemini-embedding-001` | Embedding model |
| `BYTEZ_MODEL` | No | `google/gemini-2.5-flash-lite` | Bytez model |
| `FORECAST_CACHE_TTL` | No | `3600` | Market forecast cache TTL (seconds) |
| `RAG_CACHE_TTL` | No | `86400` | RAG cache TTL (seconds) |
| `DATASET_CACHE_TTL` | No | `300` | Dataset cache TTL (seconds) |
| `MIN_QUIZ_UNLOCK_SCORE` | No | `70.0` | Minimum quiz score to unlock next skill |

### Frontend

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | Yes | — | Backend API URL |
| `VITE_SUPABASE_URL` | Yes | — | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | — | Supabase anonymous key |

---

## Database Setup

### 1. Create Tables

Execute `backend/supabase_schema.sql` in Supabase SQL Editor. This creates:
- 12 tables with proper indexes
- PGVector extension for vector similarity search
- `match_knowledge()` RPC function for RAG retrieval
- Unique constraints and foreign keys

### 2. Enable RLS (Optional)

For production, enable Row Level Security:

```sql
-- Execute supabase-rls-policies.sql
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_analyses ENABLE ROW LEVEL SECURITY;
```

### 3. Seed Content (Optional)

Load 265 JSON content files covering 88+ skills:

```bash
cd backend
python -m app.scripts.seed_content --dry-run  # Preview
python -m app.scripts.seed_content             # Execute
python -m app.scripts.seed_content --skill python  # Single skill
```

---

## ML Model Training

### First-Time Setup

```bash
cd backend
python -m app.ml_pipeline.train_v2 --seed 42
```

This will:
1. Load training data from Supabase (`resume_analysis_synthetic_v2` table)
2. Engineer features (152 dimensions)
3. Train RandomForest classifier (300 trees) and regressor
4. Evaluate on held-out test set
5. Save artifacts to `backend/models/`

### Expected Output

```
JOBYN — Model Training v2.0
Step 1/5 — Loading dataset (real + synthetic_v2) …
  Loaded 57,100 records
Step 2/5 — Engineering features …
  152 features per sample
Step 3/5 — Training classifier …
  Accuracy: 94.98%, F1 Macro: 0.857
Step 4/5 — Training regressor …
  RMSE: 2.566, R²: 0.992
Step 5/5 — Saving artifacts …
  Saved: role_model_v2.pkl, score_model_v2.pkl, vocabulary_v2.pkl
  ONNX export: score_model_v2.onnx
```

### Retraining

After uploading new resumes, retrain to incorporate new data:

```bash
python -m app.ml_pipeline.train_v2 --seed 42
```

Or via API (admin):

```bash
curl -X POST https://your-api.onrender.com/ml/recompute-model \
  -H "Authorization: Bearer <admin-token>"
```

---

## CI/CD Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on:
- Push to `main` or `develop`
- Pull requests to `main`

### Frontend Job

```yaml
- npm ci                    # Install dependencies
- npx tsc --noEmit          # TypeScript type check
- npx vitest run            # Unit tests
- npx vite build            # Production build
```

### Backend Job

```yaml
- pip install -r requirements.txt
- ruff check app/ --select E,F,W --ignore E501  # Lint
- python -m pytest tests/ -v --tb=short          # Unit tests
```

### Deploy Job

Runs only on `main` push after both jobs pass. Currently a placeholder — configure your deployment target.

---

## Health Checks

| Endpoint | Purpose |
|---|---|
| `GET /` | Full service status (version, model, DB, cache) |
| `GET /health` | Lightweight uptime probe |
| `GET /ml/status` | ML pipeline health (model loaded, dataset size) |
| `GET /docs` | Swagger UI (also used by Render for health checks) |

---

## Troubleshooting

### ML models not loading

```
ML model load failed: [Errno 2] No such file or directory
```

**Fix**: Train models first:
```bash
python -m app.ml_pipeline.train_v2 --seed 42
```

### Supabase connection failed

```
Supabase disconnected — ...
```

**Fix**: Check `SUPABASE_URL` and `SUPABASE_KEY` in `.env`. Ensure the Supabase project is active.

### JWT verification failed

```
Invalid or expired token
```

**Fix**: Ensure `SUPABASE_JWT_SECRET` matches the JWT secret in Supabase Dashboard → Settings → API.

### CORS errors

```
Access to fetch blocked by CORS policy
```

**Fix**: Add your frontend domain to `CORS_ORIGINS` in backend `.env`:
```env
CORS_ORIGINS=https://your-frontend.onrender.com,http://localhost:5173
```

### Rate limit exceeded

```
429 Too Many Requests
```

**Fix**: Adjust rate limits in `.env` or wait for the window to reset.
