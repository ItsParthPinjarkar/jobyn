<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-blue?style=flat-square&logo=python&logoColor=white" alt="Python 3.12" />
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node 20+" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/badge/ML_Accuracy-95%25-brightgreen?style=flat-square" alt="95% Accuracy" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/ONNX_Runtime-005CED?style=flat-square&logo=onnx&logoColor=white" />
</p>

<h1 align="center">Jobyn™</h1>

<p align="center">
  <b>Resume intelligence, powered by machine learning.</b><br/>
  <i>Score your resume. Find your gaps. Get placement ready.</i>
</p>

<p align="center">
  <sub>Built by <b>Ganesh Kumar T</b> &middot; © 2026 &middot; MIT-licensed</sub>
</p>

---

## What is this?

Jobyn is a career readiness platform for engineering students. It combines **deterministic scoring**, **ML inference trained on 57,100 resumes**, and **generative AI** to give you a precise, actionable picture of where you stand — and what to fix.

Upload a PDF or DOCX resume. Get a role-specific readiness score. See exactly which skills you're missing. Practice interviews. Track your progress.

> **Not a resume scanner. A career intelligence system.**

---

## How it works

1. **Upload** — drop a PDF or DOCX resume
2. **Score** — deterministic formula + ML model predict your readiness
3. **Analyze** — skill gaps mapped against real placement requirements
4. **Practice** — AI-generated study material, mock interviews, project ideas
5. **Track** — XP system, streaks, milestone progress

---

## Core features

| Feature | What it does |
|---|---|
| **Resume Analysis** | Extracts 50+ skills, auto-detects best-fit role across 7 career paths |
| **Readiness Score** | Weighted formula: Core Skills 60% + Optional 15% + Projects 15% + ATS 5% + Structure 5% |
| **ML Prediction** | RandomForest classifier (95% accuracy) + regressor (R²=0.992), exportable to ONNX |
| **Skill Gap Radar** | Interactive dependency graph with 60+ prerequisites, prioritized by placement impact |
| **AI Study Hub** | RAG-powered tutorials, LeetCode problems, quizzes, and an AI chat assistant |
| **Interview Practice** | 30+ role-specific questions with voice input and concept coverage scoring |
| **Project Generator** | AI-generated capstone projects + GitHub repo verification with 5-criteria scoring |
| **Improvement Plan** | Dependency-aware learning roadmap with day-by-day scheduling |
| **On-device ML** | ONNX Runtime Web runs inference entirely in the browser — no data leaves your machine |

---

## Supported roles

Software Developer · Frontend Developer · Backend Developer · Full Stack Developer · Data Scientist · ML Engineer · DevOps Engineer

---

## Tech stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS, shadcn/ui, React Flow, Framer Motion |
| **Backend** | FastAPI, Python 3.12, Uvicorn, Pydantic v2, SlowAPI |
| **ML / AI** | Scikit-Learn (RandomForest), ONNX Runtime, Google Gemini 2.0, LangChain |
| **Database** | Supabase (PostgreSQL + PGVector), Redis (optional) |
| **Auth** | Supabase Auth, JWT (ES256/RS256), Fernet AES encryption |
| **Parsing** | pdfplumber, python-docx, python-magic |

---

## Getting started

### Prerequisites

- Python 3.12+
- Node.js 20+

### Clone

```bash
git clone https://github.com/ItsParthPinjarkar/jobyn.git
cd jobyn
```

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env` (see `backend/.env.example` for all options):

```env
# Optional — app works without Supabase (local mode)
GEMINI_API_KEY=your-gemini-key
BYTEZ_API_KEY=your-bytez-key
```

Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

---

## Project structure

```
jobyn/
├── frontend/                    # React + TypeScript SPA
│   ├── src/
│   │   ├── pages/               # 28 lazy-loaded pages
│   │   ├── components/          # UI, landing, primitives, patterns
│   │   ├── context/             # Auth, Resume, Privacy providers
│   │   └── utils/               # ONNX predictor, gamification
│   └── public/
│       ├── models/              # ONNX model + vocabulary
│       └── ort/                 # ONNX Runtime WASM binaries
│
├── backend/                     # FastAPI + ML backend
│   ├── app/
│   │   ├── main.py              # App factory, middleware
│   │   ├── routers/             # 19 routers, 79 endpoints
│   │   ├── services/            # Business logic modules
│   │   ├── ml_pipeline/         # Training, inference, versioning
│   │   └── core/                # Config, auth, cache, rate limiter
│   ├── config/                  # roles.json, scoring.json, skills.json
│   ├── models/                  # Trained ML artifacts (ONNX + pickle)
│   └── tests/                   # Pytest test suite
│
├── docs/                        # API, architecture, deployment guides
└── docker-compose.yml           # Multi-container setup
```

---

## ML models

| Model | Algorithm | Accuracy | Features |
|---|---|---|---|
| **Role Classifier v2** | RandomForest (80 trees, depth 12) | **95.0%** (F1: 0.857) | 152 (147 skills + 5 numeric) |
| **Score Regressor v2** | RandomForest (80 trees, depth 12) | **R²=0.992** (RMSE: 2.57) | 152 (147 skills + 5 numeric) |

ONNX export available for browser-side inference via WebAssembly.

---

## API

79 endpoints across 19 routers. Highlights:

| Endpoint | Purpose |
|---|---|
| `POST /upload` | Upload resume, get full readiness analysis |
| `POST /predict` | ML-powered role + score prediction |
| `GET /roles` | List supported career paths |
| `GET /health` | Service health check |

Swagger docs at **http://localhost:8000/docs** when running locally.

---

## Testing

```bash
# Backend
cd backend && python -m pytest tests/ -v

# Frontend
cd frontend && npx vitest run
```

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>Jobyn™ — From Resume to Ready.</b><br/>
  <sub>© 2026 Ganesh Kumar T</sub>
</p>
