<p align="center">
  <a href="https://github.com/Ganesh-0509/Jobyn/actions/workflows/ci.yml"><img src="https://github.com/Ganesh-0509/Jobyn/actions/workflows/ci.yml/badge.svg?branch=main-backup" alt="CI Status" /></a>
  <a href="https://github.com/Ganesh-0509/Jobyn/actions/workflows/deploy-frontend.yml"><img src="https://github.com/Ganesh-0509/Jobyn/actions/workflows/deploy-frontend.yml/badge.svg" alt="Deploy Status" /></a>
  <img src="https://img.shields.io/badge/Python-3.12-blue?style=flat-square&logo=python&logoColor=white" alt="Python 3.12" />
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node 20+" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/badge/API_Endpoints-79-orange?style=flat-square" alt="79 Endpoints" />
  <img src="https://img.shields.io/badge/ML_Accuracy-95%25-brightgreen?style=flat-square" alt="95% Accuracy" />
</p>

<h1 align="center">Jobyn&trade;</h1>

<p align="center">
  <b>AI-Powered Career Intelligence Platform for Engineering Students</b><br/>
  <i>Know your readiness. Close every gap. Land the role.</i>
</p>

<p align="center">
  <sub>Created, designed, and built by <b>Ganesh Kumar T</b> &middot; original work, &copy; 2026 &middot; MIT-licensed</sub>
</p>

<p align="center">
  <a href="https://getjobyn.pages.dev/">Live Demo</a> &middot;
  <a href="docs/API.md">API Reference</a> &middot;
  <a href="docs/ARCHITECTURE.md">Architecture</a> &middot;
  <a href="docs/DEPLOYMENT.md">Deployment</a> &middot;
  <a href="docs/CONTRIBUTING.md">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Scikit--Learn-F7931E?style=flat-square&logo=scikit-learn&logoColor=white" />
  <img src="https://img.shields.io/badge/ONNX_Runtime-005CED?style=flat-square&logo=onnx&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini_AI-4285F4?style=flat-square&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/PGVector-336791?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" />
</p>

<p align="center">
  <video src="https://github.com/Ganesh-0509/Jobyn/raw/main-backup/frontend/public/jobyn-hero.mp4" poster="https://getjobyn.pages.dev/jobyn-hero-poster.png" controls muted loop width="820"></video>
  <br/>
  <a href="https://getjobyn.pages.dev/jobyn-intro.mp4"><b>▶ Watch the full 70-second narrated demo</b></a> &nbsp;—&nbsp; the real logged-in product: readiness dashboard, skill-gap dependency graph, a <b>live AI mock interview scored 91%</b>, and GitHub project verification.
  <br/>
  <sub>Player not loading? <a href="https://getjobyn.pages.dev/jobyn-intro.mp4">Open the demo directly →</a></sub>
</p>

---

## What is Jobyn?

Jobyn is a **full-stack career intelligence platform** purpose-built for engineering students. Upload your resume, get a granular readiness score for your target role, identify precise skill gaps with dependency-aware learning paths, practice interviews with real-time concept analysis, build AI-generated projects, and track your growth — all powered by on-device ML and generative AI.

> **Not a resume scanner. A career intelligence system.**

The platform combines three intelligence layers:
1. **Deterministic scoring** — config-driven weighted formula (core skills, projects, ATS, structure)
2. **ML inference** — RandomForest models trained on 57,100 real resumes (95% accuracy, R²=0.992)
3. **Generative AI** — Gemini 2.0 Flash for study materials, interview simulation, and project generation

---

## Features

### Resume Analysis
- Upload **PDF** or **DOCX** resumes with drag-and-drop
- AI extracts 50+ skills, sections, links, and metadata
- **Auto role detection** — scores against all 7 career paths and picks the best match
- MIME type validation, file size limits (5MB), and XSS sanitization

### Readiness Score
- Weighted formula: **Core Skills 60%** + Optional 15% + Projects 15% + ATS 5% + Structure 5%
- 4-tier classification: Beginner / Developing / Placement Ready / Interview Ready
- Skill importance weighting: high-value skills count 1.5x

### ML Role Prediction
- **RandomForest classifier** (300 trees, depth 20) — 95% accuracy, F1 macro 0.857
- **RandomForest regressor** — predicts quality score with R²=0.992
- **ONNX export** for browser-side inference (privacy mode — no data leaves the device)
- **Cross-role validator** — scores your resume against all 7 roles simultaneously
- Model versioning with promote/delete/archive

### Skill Gap Analysis
- Interactive **SVG dependency graph** with 60+ skill prerequisites
- Prioritized gaps: Critical / High / Medium with prerequisite chains
- Click any skill node to generate a capstone project

### AI Study Hub (RAG-Powered)
- **PGVector knowledge base** with 3072-dim Gemini embeddings
- Generates structured tutorials: explanations, runnable code, key takeaways, mini-challenges
- **LeetCode integration** — 5 real problems per skill (2 Easy, 2 Medium, 1 Hard)
- Section-level quizzes with auto-grading and progress tracking
- AI chat assistant for contextual help
- 24-hour Redis caching for instant repeat access
- Community contribution pipeline (submit → review → approve → publish)

### Interview Readiness
- **30+ role-specific technical questions** across 7 career paths
- **Web Speech API** for voice-based interview practice
- Concept coverage scoring — detects which topics you hit and missed
- Session history with win rate, average score, and concept confidence map
- Diagnostic learning paths auto-generated for weak areas

### AI Project Generator & GitHub Verifier
- **AI-generated capstone projects** tailored to your target role and missing skills
- **GitHub repo verification** — fetches commits, languages, file tree, README via GitHub API
- 5-criteria scoring: skill coverage, spec alignment, code authenticity, documentation, completeness
- Verdicts: `VERIFIED` / `PARTIAL` / `INSUFFICIENT` / `SUSPICIOUS`

### Improvement Plan
- **Dependency-aware learning roadmap** with topological skill ordering
- Day-by-day scheduling with adjustable daily commitment (1h / 2h / 4h / fulltime)
- Deadline mode — auto-calculates required daily hours
- AI market forecast with sourced industry data

### Progress Tracking & Gamification
- Skill radar across 6 categories (Languages, Frameworks, Core CS, Tools, Cloud, Soft Skills)
- 6 career milestones with rail visualization
- **XP/streak system**: daily streaks with multipliers (1x → 1.5x → 2x → 3x)
- 11 levels from Beginner to Grandmaster

### Industry Alignment
- Service-Based / Product-Based / Startup alignment scores
- Resource libraries (TCS iON, Google Tech Guide, Y Combinator, etc.)

### Resume Comparison
- Side-by-side comparison of two resume versions
- Score delta with directional indicator
- Added/removed skill badges for quick diff

### AI Best Fit Recommendation
- Cross-role comparison suggesting your optimal career path
- Scores all 7 roles and explains why the top match fits

### On-Device ML Prediction
- **ONNX Runtime Web** for browser-side inference via WebAssembly
- Privacy mode — processes entirely on-device, no data sent to server

### Settings and Command Center
- Profile stats, daily learning goal slider
- Notification and privacy toggles
- GDPR right to erasure — deletes all user data across 7 tables
- System health status, data vault with export

### Landing Page
- Marketing page with scroll-driven pipeline timeline
- Speech arena demo, skill matrix explorer
- Dark luxury theme with glassmorphism

### Privacy Policy and Terms of Service
- Zero-cloud-retention data matrix, GDPR/CCPA/FERPA compliance
- WASM execution terms, IP ownership

### In-App Documentation
- Quickstart guide, ONNX WebAssembly reference, privacy framework

### Admin Dashboard
- Platform metrics, content moderation queue, student directory with pagination
- Database explorer, contribution approve/reject workflow
- Role-based access control with configurable admin email allowlist

### Privacy & Security
- **AES encryption** at rest for resume data (Fernet symmetric)
- **Privacy mode** — processes in-memory only, no cloud storage
- JWT authentication (Supabase Auth — asymmetric ES256/RS256 via JWKS; legacy HS256 fallback)
- 4-tier rate limiting (60/min general, 10/min upload, 20/min AI, 30/min per-user)
- Security headers: HSTS, X-Content-Type-Options, X-Frame-Options, XSS-Protection
- MIME validation, body size limits (10MB), input sanitization
- IDOR prevention on all user-data endpoints
- **GDPR right to erasure** — deletes all user data across 7 tables
- Sentry error tracking

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React 18 + TypeScript + Vite)            │
│                                                                         │
│  Landing  Dashboard  ResumeAnalyzer  SkillGap  ImprovementPlan         │
│  InterviewReadiness  ProgressTracking  MyProjects  StudyHub             │
│  IndustryAlignment  ReadinessScore  ResumeComparison  AdminDashboard   │
│  ResumeBuilder  JDMatch  CompanyPrep  CodingPractice  QuickScore       │
│  Certificate  Blog  BlogPost  Onboarding  Login  Signup  Settings      │
│  Privacy  Terms  Docs  NotFound          (28 pages, lazy-loaded)        │
│                                                                         │
│  ONNX Runtime (browser-side ML)  |  React Flow (skill graphs)          │
│  Web Speech API (voice)  |  DOMPurify (XSS protection)                 │
├─────────────────────────────────────────────────────────────────────────┤
│                      BACKEND (FastAPI + Python 3.12)                    │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Resume Parser │  │ Scoring      │  │ ML Pipeline  │                  │
│  │ (PDF/DOCX)   │  │ Engine       │  │ (RF v2)      │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ RAG Service  │  │ Interview    │  │ Project      │                  │
│  │ (PGVector)   │  │ Engine       │  │ Verifier     │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Gemini AI    │  │ Bytez        │  │ Encryption   │                  │
│  │ (primary)    │  │ (fallback)   │  │ (Fernet AES) │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
├─────────────────────────────────────────────────────────────────────────┤
│                      DATA LAYER                                        │
│                                                                         │
│  Supabase (PostgreSQL + Auth + RLS)                                     │
│  PGVector (3072-dim embeddings + cosine similarity)                     │
│  Redis (optional — L1 cache, 24h TTL for AI content)                    │
│  SQLite (local dev fallback)                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript 5.5, Vite 5, React Router v6, Tailwind CSS v4, shadcn/ui, React Flow, Framer Motion, Lucide Icons, DOMPurify, React Markdown, ONNX Runtime Web |
| **Backend** | FastAPI, Uvicorn, Pydantic v2, SlowAPI, Python 3.12 |
| **ML / AI** | Scikit-Learn (RandomForest), ONNX Runtime, Google Gemini 2.0 Flash, Gemini Embeddings (3072-dim), Bytez SDK, LangChain Text Splitters |
| **Database** | Supabase (PostgreSQL 15), PGVector, Redis (optional) |
| **Auth** | Supabase Auth, PyJWT (ES256/RS256 via JWKS, legacy HS256), Fernet AES Encryption |
| **Document Parsing** | pdfplumber, python-docx, python-magic |
| **Testing** | Pytest, Vitest, Ruff (linting) |
| **CI/CD** | GitHub Actions (lint → test → build → deploy) |
| **Deployment** | Render Blueprint, Docker + docker-compose, Nginx |

---

## Project Structure

```
Jobyn/
├── frontend/                         # React + TypeScript SPA
│   ├── src/
│   │   ├── pages/                    # 28 page components (lazy-loaded)
│   │   ├── components/               # Reusable UI + design primitives
│   │   │   ├── ui/                   # shadcn/ui base components
│   │   │   ├── primitives/           # motion, layout, surface, feedback, viz
│   │   │   ├── patterns/             # DragDropUpload, MetricGrid, Timeline
│   │   │   ├── landing/              # Landing page components
│   │   │   ├── StudyHub.tsx          # 4-tab learning environment
│   │   │   ├── SkillGraphViz.tsx     # SVG dependency graph
│   │   │   ├── ProjectVerifier.tsx   # GitHub verification widget
│   │   │   └── ...
│   │   ├── context/                  # Auth, Resume, Toast, Privacy providers
│   │   ├── api/                      # Central API client with retry + cache
│   │   ├── config/                   # Feature flags
│   │   └── utils/                    # ONNX predictor, sanitization, gamification
│   ├── public/
│   │   ├── models/                   # ONNX model + vocabulary (browser-side ML)
│   │   └── ort/                      # ONNX Runtime WASM binaries
│   └── package.json
│
├── backend/                          # FastAPI + ML backend
│   ├── app/
│   │   ├── main.py                   # App factory, middleware, lifespan
│   │   ├── routers/                  # 19 routers, 79 API endpoints
│   │   ├── services/                 # 18 service modules (business logic)
│   │   ├── ml_pipeline/              # Training, inference, versioning
│   │   ├── core/                     # Settings, auth, cache, rate limiter
│   │   ├── utils/                    # Validation, LLM utilities
│   │   └── scripts/                  # Content seeding, knowledge embedding
│   ├── config/                       # scoring.json, roles.json, skills.json
│   ├── data/                         # 9 CSV training datasets
│   ├── models/                       # Trained ML artifacts (.pkl, .onnx) — gitignored, fetched at deploy
│   ├── knowledge_base/               # Static RAG source documents
│   ├── tests/                        # Pytest test suite
│   ├── supabase_schema.sql           # Full database schema (12 tables)
│   ├── Dockerfile                    # Python 3.12-slim container
│   └── requirements.txt              # 34 Python dependencies
│
├── docs/                             # Documentation
│   ├── API.md                        # Full API reference (79 endpoints)
│   ├── ARCHITECTURE.md               # System architecture & data flow
│   ├── DEPLOYMENT.md                 # Deployment guide
│   └── CONTRIBUTING.md               # Developer guide
│
├── bolna-poc/                        # Voice AI integration proof-of-concept
├── docker-compose.yml                # Multi-container setup
├── render.yaml                       # Render deployment blueprint
└── .github/workflows/ci.yml         # CI pipeline
```

---

## Quick Start

### Prerequisites

- **Python 3.12+** and **Node.js 20+**
- **Supabase** project ([free tier](https://supabase.com/))
- **Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))
- **Redis** (optional — for caching)

### 1. Clone

```bash
git clone https://github.com/Ganesh-0509/Jobyn.git
cd Jobyn
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
```

Create `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-gemini-key
BYTEZ_API_KEY=your-bytez-key          # optional
REDIS_URL=redis://localhost:6379       # optional
```

Run the database schema:
```sql
-- Execute backend/supabase_schema.sql in Supabase SQL Editor
```

Train ML models (first-time):
```bash
python -m app.ml_pipeline.train_v2 --seed 42
```

Start the API:
```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Start dev server:
```bash
npm run dev
```

Open **http://localhost:5173** — you're live.

### 4. Docker (Alternative)

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

---

## ML Pipeline

| Model | Algorithm | Accuracy | Dataset | Features |
|---|---|---|---|---|
| **Role Classifier v2** | RandomForest (300 trees, depth 20) | **94.98%** (F1: 0.857) | 57,100 real resumes | 152 (147 skill + 5 numeric) |
| **Score Regressor v2** | RandomForest (300 trees, depth 20) | **R²=0.992** (RMSE: 2.566) | 57,100 real resumes | 152 (147 skill + 5 numeric) |

**Supported Roles** (7): Software Developer, Frontend Developer, Backend Developer, Full Stack Developer, Data Scientist, ML Engineer, DevOps Engineer

**ONNX Export**: Score model exported to ONNX for cross-platform edge inference in the browser via WebAssembly.

**Model Versioning**: v1 and v2 artifacts coexist. Admin can promote/delete/archive versions via API.

---

## API Overview

**79 endpoints** across 19 routers. Full reference: [docs/API.md](docs/API.md)

| Router | Prefix | Endpoints | Purpose |
|---|---|---|---|
| Analysis | `/` | 2 | Resume upload, role listing |
| Inference | `/` | 1 | ML score/role prediction |
| Hybrid Intelligence | `/ml` | 10 | Cross-role validation, skill impact, model versioning |
| Data | `/` | 8 | History, comparison, analytics, export, GDPR deletion |
| AI Insights | `/ai` | 23 | Study hub, interviews, curriculum, smart plan, admin |
| Interview | `/interview` | 5 | Rule-based Q&A, skill dependencies |
| Feedback | `/feedback` | 3 | Prediction corrections |
| Content Feedback | `/content-feedback` | 3 | Study content quality |
| Projects | `/projects` | 2 | Project generation, GitHub verification |
| Assessment | `/assessment` | 2 | Opt-in skill verification |
| Benchmarks | `/benchmarks` | 1 | Peer benchmarking |
| Coding Practice | `/coding` | 6 | Coding problems, test runner |
| Company Prep | `/company-prep` | 2 | Company-specific interview prep |
| JD Matcher | `/jd` | 2 | Job-description matching |
| Manual Profile | `/` | 2 | Manual profile entry, skills list |
| Onboarding | `/onboarding` | 3 | Onboarding email/nudge flow |
| Quick Score | `/quick-score` | 1 | Public one-shot resume scoring |
| Resume Builder | `/` | 1 | AI/template resume generation |
| Sandbox | `/sandbox` | 2 | Code execution sandbox |

---

## Database Schema

**12 tables** in Supabase (PostgreSQL 15 + PGVector):

| Table | Records | Purpose |
|---|---|---|
| `resumes` | User data | Uploaded resume metadata, extracted skills, encrypted text |
| `role_analyses` | User data | Per-role analysis results with 5-dimension scoring |
| `resume_analysis_synthetic` | Training | v1 synthetic training data |
| `resume_analysis_synthetic_v2` | Training | 57,100 real resume records |
| `knowledge_chunks` | RAG | PGVector embeddings (3072-dim) for similarity search |
| `prediction_feedback` | Feedback | User corrections on ML predictions |
| `knowledge_cache` | Cache | Cached AI-generated content (topic + type) |
| `contributions` | Community | User-submitted study notes (pending/approved/rejected) |
| `dynamic_curriculums` | Content | N-section syllabus structures per skill |
| `user_study_progress` | Progress | Completed sections per user per skill |
| `user_quiz_attempts` | Progress | Quiz scores and pass/fail per section |
| `content_feedback` | Quality | User feedback on study content |

Full schema: [backend/supabase_schema.sql](backend/supabase_schema.sql)

---

## Environment Variables

### Backend (`backend/.env`)

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
| `RESUME_ENCRYPTION_KEY` | No | — | Fernet key for AES encryption at rest |
| `MAX_UPLOAD_BYTES` | No | `5000000` | Max file upload size (bytes) |
| `RATE_LIMIT_DEFAULT` | No | `60/minute` | General rate limit |
| `RATE_LIMIT_UPLOAD` | No | `10/minute` | Upload rate limit |
| `RATE_LIMIT_AI` | No | `20/minute` | AI endpoint rate limit |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend API URL |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |

---

## Deployment

### Frontend: Cloudflare Pages

Live at **https://getjobyn.pages.dev**. A GitHub Actions workflow
(`.github/workflows/deploy-frontend.yml`) builds the SPA **with prerendering** —
so public pages ship real HTML and are crawlable/indexable — and uploads `dist/`
to Cloudflare Pages via Wrangler on every push to `main-backup`.

### Backend: Render

Render Blueprint (`render.yaml`) provisions `jobyn-api` (FastAPI + Uvicorn).
Set environment variables in the Render dashboard.

### Docker

```bash
docker-compose up --build
```

### CI/CD

GitHub Actions:
- **`ci.yml`** — Frontend (TypeScript check, Vitest, Vite build) + Backend (Ruff lint, Pytest), on push/PR to `main-backup`
- **`deploy-frontend.yml`** — builds with prerender, then deploys `dist/` to Cloudflare Pages on `main-backup`

---

## Testing

```bash
# Backend
cd backend
python -m pytest tests/ -v --tb=short

# Frontend
cd frontend
npx vitest run
```

**Test coverage**: 9 backend test files covering auth, upload validation, ML prediction, the core scoring pipeline, skill assessment, session recovery, skill proficiency, export/history/analytics, and integration. Frontend: Vitest suites for history, sanitization, storage, and streak tracking.

---

## Authorship & Ownership

**Jobyn™** is the original work of **Ganesh Kumar T**, sole author and creator. The name, design, source code, and machine-learning models in this repository were conceived and built by the author. Authorship is evidenced by the complete, timestamped commit history of this public repository and the [MIT LICENSE](LICENSE) (© 2026 Ganesh Kumar T).

"Jobyn" is used as an unregistered trademark (™) of the author. All rights in the mark and the product are reserved by the author.

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>Jobyn&trade; — From Resume to Ready.</b><br/>
  <sub>&copy; 2026 Ganesh Kumar T</sub>
</p>