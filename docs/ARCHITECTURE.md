# Architecture — Jobyn

## System Overview

Jobyn is a three-tier web application: a React SPA frontend, a FastAPI Python backend, and a Supabase (PostgreSQL) data layer. The system combines deterministic scoring, ML inference, and generative AI to provide career intelligence to engineering students.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                             │
│                                                                     │
│  React 18 + TypeScript + Vite                                       │
│  ├── ONNX Runtime Web (browser-side ML inference)                   │
│  ├── Web Speech API (voice interview)                               │
│  ├── React Flow (skill dependency graphs)                           │
│  └── DOMPurify (XSS sanitization)                                   │
│                                                                     │
│  State: React Context + localStorage (user-scoped keys)             │
│  API:   Centralized fetch wrapper with retry + stale-while-revalidate│
├─────────────────────────────────────────────────────────────────────┤
│                        SERVER (FastAPI)                              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ MIDDLEWARE                                                    │   │
│  │ CORS → Rate Limiting → Body Size Limit → Security Headers    │   │
│  │ → Auth Audit Logging → Global Error Handler                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ROUTERS (19 routers, 79 endpoints)                           │   │
│  │ analyze inference ml data ai_insight interview feedback       │   │
│  │ content_feedback project_generator assessment benchmark       │   │
│  │ coding company_prep jd_match manual_profile onboarding_email  │   │
│  │ quick_score resume_builder sandbox                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ SERVICES (18 service modules)                                 │   │
│  │                                                               │   │
│  │ CORE PIPELINE          AI SERVICES        DATA SERVICES      │   │
│  │ resume_parser          gemini_service     knowledge_service  │   │
│  │ skill_dictionary       bytez_service      rag_service        │   │
│  │ role_readiness_engine  ai_service         curriculum_graph   │   │
│  │ scoring_engine         interview_service  content_feedback   │   │
│  │ ats_engine             project_generator  feedback_service   │   │
│  │ project_engine         project_verifier   encryption_service │   │
│  │ skill_gap_engine       scraper_service    jd_matcher         │   │
│  │ role_matrix                                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ML PIPELINE                                                   │   │
│  │ train_v2 → feature_engineering → evaluation                  │   │
│  │ model_registry → model_versioning → data_loader              │   │
│  │ similarity_engine → skill_impact → projection_engine         │   │
│  └─────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                        DATA LAYER                                   │
│                                                                     │
│  Supabase (PostgreSQL 15)     Redis (optional)                      │
│  ├── 12 tables                ├── L1 cache (24h TTL)                │
│  ├── PGVector extension       ├── Namespaced: cse:*                 │
│  ├── Auth (JWT)               └── Fallback: in-memory dict          │
│  └── RLS policies                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Resume Upload → Career Intelligence

```
1. UPLOAD
   Browser → POST /upload (multipart/form-data)
   → MIME validation (python-magic)
   → File size check (5MB max)
   → Filename sanitization (path traversal prevention)

2. PARSE
   pdfplumber/python-docx → raw_text + sections + links
   → Text validation (10–500,000 chars)
   → Optional Fernet encryption at rest

3. EXTRACT SKILLS
   skill_dictionary (147 canonical skills, Levenshtein fuzzy matching)
   → Binary skill vector: ["python", "react", "sql", ...]

4. DETERMINISTIC SCORING (per role)
   ┌─────────────────────────────────────────────────┐
   │ Core Coverage (60%)     = matched_core / total_core × 1.5 weight │
   │ Optional Coverage (15%) = matched_optional / total_optional      │
   │ Project Score (15%)     = project_engine(raw_text)               │
   │ ATS Score (5%)          = ats_engine(raw_text)                   │
   │ Structure Score (5%)    = sections_detected / 4                  │
   │                                                               │
   │ Final = (Core × 0.60) + (Optional × 0.15) + (Project × 0.15) │
   │       + (ATS × 0.05) + (Structure × 0.05)                     │
   └─────────────────────────────────────────────────┘

5. AUTO ROLE DETECTION
   Score against all 7 roles → rank by final_score → pick best

6. ML PREDICTION (parallel)
   Feature vector (152 dims) → RandomForest classifier → role + confidence
   Feature vector → RandomForest regressor → quality score

7. PERSIST
   Supabase: resumes table + role_analyses table

8. RESPONSE
   Combined deterministic + ML results → Browser
```

---

## ML Pipeline

### Training

```
Data Sources:
  ├── resume_analysis_synthetic_v2 (57,100 real resumes from HuggingFace)
  └── resumes table (user-uploaded resumes)

Feature Engineering:
  ├── Binary skill vector (147 dimensions, one-hot against vocabulary)
  ├── 5 numeric features (normalized 0-1):
  │   core_coverage, optional_coverage, project_score, ats_score, structure_score
  └── Total: 152 features per sample

Training:
  ├── 80/20 stratified split (random seed 42)
  ├── RandomForestClassifier: n_estimators=300, max_depth=20, min_samples_leaf=3, class_weight=balanced
  ├── RandomForestRegressor: same hyperparameters
  └── LabelEncoder for role class mapping

Evaluation:
  ├── Classifier: 94.98% accuracy, F1 macro 0.857
  ├── Regressor: R²=0.992, RMSE=2.566
  └── Confusion matrix, per-class F1 scores

Artifacts (backend/models/):
  ├── role_model_v2.pkl       # Classifier
  ├── score_model_v2.pkl      # Regressor
  ├── score_model_v2.onnx     # ONNX export (browser inference)
  ├── vocabulary_v2.pkl       # Skill vocabulary (147 skills)
  ├── vocabulary_v2_list.json # JSON copy for frontend
  └── metadata_v2.json        # Training metadata
```

### Inference (Server-Side)

```
Input: ResumeInput (skills list + 5 numeric features)
  ↓
Feature transform: binary vector (147) + normalized numerics (5)
  ↓
RandomForestClassifier → predicted_role + confidence (max predict_proba)
RandomForestRegressor → resume_score (0-100)
  ↓
Weak area detection: primary (numeric features < 50%), fallback (bottom-3 by importance)
  ↓
Output: ResumePrediction (role, confidence, score, weak_areas, latency_ms)
```

### Inference (Browser-Side / ONNX)

```
Input: Same feature vector
  ↓
ONNX Runtime Web (WASM) → score_model_v2.onnx
  ↓
Predicted score (privacy mode — no data leaves device)
```

### Model Versioning

- Version manifest stored in `model_manifest.json`
- Auto-incrementing tags (v1, v2, v3, ...)
- Admin can promote/delete/archive versions via API
- Active version loaded at startup

---

## RAG Pipeline

```
Knowledge Sources:
  ├── knowledge_base/ (static markdown: DSA, web topics)
  ├── Admin-ingested URLs (Pathway A: scrape → chunk → embed)
  ├── Community contributions (submit → review → approve)
  └── Seed content (265 JSON files, 88+ skills)

Embedding:
  ├── Model: gemini-embedding-001 (3072 dimensions)
  ├── Chunking: 1200 chars with 200-char overlap
  └── Storage: knowledge_chunks table (PGVector)

Retrieval:
  ├── match_knowledge() RPC function
  ├── Cosine similarity search
  └── Top-K results (configurable)

Generation:
  ├── Primary: Gemini 2.0 Flash
  ├── Fallback: Bytez (google/gemini-2.5-flash-lite)
  ├── Context: retrieved chunks + skill metadata
  └── Output: structured JSON (explanation, code, takeaway, challenge)

Caching:
  ├── L1: Redis (24h TTL, namespaced cse:*)
  ├── L2: knowledge_cache table (Supabase)
  └── Cache versioning: CACHE_VERSION = 4 (auto-invalidation)
```

---

## Dual LLM Strategy

```
Request → Gemini 2.0 Flash
  ├── Success → Return response
  └── Failure (429/quota/error) → Bytez fallback
        ├── Success → Return response
        └── Failure → Rule-based fallback (interview scoring, etc.)
```

**Gemini** (primary): Used for all generative tasks — study materials, quizzes, market forecasts, chat, interview simulation, project generation/verification, course compilation.

**Bytez** (fallback): Same capabilities as Gemini but with different quota. Used when Gemini is unavailable or rate-limited.

**Rule-based** (last resort): Interview engine has 30+ pre-built questions with keyword/concept matching. No LLM required.

---

## Database Schema

### Entity Relationship

```
resumes (1) ──── (N) role_analyses
     │                    │
     │                    └── (N) prediction_feedback
     │
     └── user_email (auth link)

knowledge_chunks (PGVector)
knowledge_cache (topic + type)
dynamic_curriculums (skill → sections[])

user_study_progress (user_email + skill)
user_quiz_attempts (user_email + skill + section_idx)
content_feedback (user_email + skill)
contributions (submitted_by)
```

### Tables

| Table | Key Columns | Purpose |
|---|---|---|
| `resumes` | id, filename, raw_text, detected_skills (JSONB), user_email | Uploaded resume metadata |
| `role_analyses` | id, resume_id (FK), role, final_score, 5 dimension scores, missing_skills | Per-role analysis results |
| `resume_analysis_synthetic` | detected_skills, role, final_score | v1 synthetic training data |
| `resume_analysis_synthetic_v2` | same as v1 | 57,100 real resume records |
| `knowledge_chunks` | id (UUID), topic, content, embedding (vector 3072) | RAG vector store |
| `prediction_feedback` | analysis_id (FK), predicted_role, correct_role, score_feedback | User corrections |
| `knowledge_cache` | topic, type, content (JSONB) | Cached AI content |
| `contributions` | topic, submitted_by, content (JSONB), status | Community submissions |
| `dynamic_curriculums` | skill (UNIQUE), sections (JSONB) | Syllabus structures |
| `user_study_progress` | user_email, skill, completed_sections (JSONB), mastered | Study progress |
| `user_quiz_attempts` | user_email, skill, section_idx, score, passed | Quiz results |
| `content_feedback` | skill, section_idx, feedback_type, rating, comment | Content quality feedback |

---

## Security Architecture

### Authentication Flow

```
Browser → Supabase Auth (email/password or Google OAuth)
  ↓
Supabase returns JWT (ES256/RS256, audience: "authenticated")
  ↓
Browser sends Authorization: Bearer <token>
  ↓
FastAPI auth.py:
  ├── Fetch signing key from Supabase JWKS (PyJWKClient, cached)
  └── Verify signature (ES256/RS256) + expiry + audience (legacy HS256 fallback)
  ↓
AuthUser(sub, email, role) → Passed to endpoint via Depends()
```

### Authorization Levels

| Level | Dependency | Enforcement |
|---|---|---|
| None | — | No auth check |
| Optional | `optional_user` | Returns AuthUser if valid token, None otherwise |
| Required | `get_current_user` | 401 if no valid token |
| Admin | `get_admin_user` | 403 unless verified `app_metadata.role == 'admin'` |

### IDOR Prevention

All user-data endpoints verify ownership:
- `GET /history/{resume_id}`: Checks `resume.user_email == auth.user.email`
- `GET /session/latest/{email}`: Checks `url.email == auth.user.email`
- `DELETE /history/analysis/{id}`: Fetches resume, checks ownership
- `DELETE /history/resume/{id}`: Checks `resume.user_email == auth.user.email`

### Rate Limiting

| Tier | Limit | Key | Applies To |
|---|---|---|---|
| Default | 60/min | IP | All endpoints |
| Upload | 10/min | IP | POST /upload |
| AI | 20/min | IP | LLM endpoints |
| Heavy | 30/min | IP | Expensive endpoints |
| Per-user | 30/min | JWT sub | All AI endpoints |

### Input Validation

- **MIME validation**: python-magic checks actual file content (not just extension)
- **File size**: 5MB max (configurable via MAX_UPLOAD_BYTES)
- **Body size**: 10MB max (middleware rejects larger)
- **Text length**: 10–500,000 chars for resume text
- **XSS sanitization**: HTML entity escaping, script pattern detection
- **Path traversal**: Filename sanitization (character whitelist, max 100 chars)
- **Email**: Regex validation, max 254 chars
- **Recursive sanitization**: Nested objects cleaned before DB storage

### Security Headers

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

### Encryption

- **At rest**: Fernet symmetric encryption for resume raw_text (optional, via RESUME_ENCRYPTION_KEY)
- **In transit**: HTTPS enforced via HSTS header
- **JWT**: ES256/RS256 verified via Supabase JWKS (legacy HS256 fallback)

---

## Feature Flags

Defined in `frontend/src/config/features.ts`:

| Flag | Default | Description |
|---|---|---|
| `ML_PREDICTIONS` | true | ONNX browser-side ML inference |
| `RAG_STUDY_MATERIALS` | true | PGVector RAG-powered study content |
| `VOICE_INTERVIEW` | true | Web Speech API voice input |
| `SKILL_GRAPH` | true | React Flow skill dependency visualization |
| `PROJECT_GENERATOR` | true | AI capstone project generation |
| `PROJECT_VERIFIER` | true | GitHub repo verification |
| `MARKET_FORECAST` | true | AI market forecast |
| `INDUSTRY_ALIGNMENT` | true | Industry alignment scores |
| `RESUME_COMPARISON` | true | Side-by-side resume comparison |
| `SHAREABLE_CERTIFICATE` | true | Shareable score badge |
| `QUICK_SCORE` | true | Anonymous 30s public score |
| `WHATSAPP_INTEGRATION` | true | Share results via WhatsApp |
| `JD_MATCHING` | true | JD-specific resume matching |
| `PEER_BENCHMARKING` | true | Percentile ranking vs peers |
| `COMPANY_PREP` | true | Company-specific interview prep |
| `CODING_PRACTICE` | true | Coding challenges |

---

## Caching Strategy

| Layer | Backend | TTL | Scope |
|---|---|---|---|
| L1 | Redis | 24h | AI content (study notes, forecasts, scraped URLs) |
| L2 | Supabase knowledge_cache | Manual | Knowledge lookups (topic + type) |
| L3 | In-memory dict | 5min | ML dataset, health status |
| Frontend | stale-while-revalidate | 5min (roles), 30s (health) | API responses |
| Auth token | In-memory | 55s | Supabase access token |

Cache versioning via `CACHE_VERSION` constant — bump to invalidate all cached content.

---

## Deployment Architecture

### Render (Production)

```
┌─────────────────────────────────────────┐
│ Render Blueprint (render.yaml)           │
│                                          │
│  jobyn-api (Web Service)                 │
│  ├── Python 3.12 + Uvicorn              │
│  ├── Port: 8000                          │
│  ├── Health: GET /docs                   │
│  └── Region: Oregon                      │
│                                          │
│  jobyn (Static Site)                     │
│  ├── Vite build → dist/                  │
│  ├── Nginx serving                       │
│  ├── SPA fallback (index.html)           │
│  └── Static asset caching (1 year)       │
└─────────────────────────────────────────┘
```

### Docker

```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    healthcheck: GET /docs

  frontend:
    build: ./frontend
    ports: ["3000:80"]
    depends_on: backend
```

### CI/CD (GitHub Actions)

```
Push to main/develop or PR → main:
  ├── Frontend job:
  │   ├── npm ci
  │   ├── tsc --noEmit (type check)
  │   ├── vitest run (unit tests)
  │   └── vite build
  ├── Backend job:
  │   ├── pip install
  │   ├── ruff check (lint)
  │   └── pytest (unit tests)
  └── Deploy job (main only):
      └── Placeholder for deployment target
```
