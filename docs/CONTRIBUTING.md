# Contributing to Jobyn

## Local Development Setup

### Prerequisites

- **Python 3.12+** ([python.org](https://python.org/))
- **Node.js 20+** ([nodejs.org](https://nodejs.org/))
- **Git** ([git-scm.com](https://git-scm.com/))
- **Supabase** project (free tier)
- **Gemini API Key** (Google AI Studio)

### Quick Setup

```bash
# Clone
git clone https://github.com/Ganesh-0509/Jobyn.git
cd Jobyn

# Backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
# Create .env with your credentials (see docs/DEPLOYMENT.md)
python -m app.ml_pipeline.train_v2 --seed 42
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
# Create .env with your credentials
npm run dev
```

---

## Project Structure

```
Jobyn/
├── frontend/                    # React + TypeScript SPA
│   ├── src/
│   │   ├── pages/               # 28 page components (lazy-loaded)
│   │   ├── components/          # UI components + design primitives
│   │   ├── context/             # Auth, Resume, Toast, Privacy providers
│   │   ├── api/                 # Central API client
│   │   ├── config/              # Feature flags
│   │   └── utils/               # Helpers (ONNX, sanitization, gamification)
│   └── package.json
│
├── backend/                     # FastAPI + ML backend
│   ├── app/
│   │   ├── main.py              # App factory + middleware
│   │   ├── routers/             # 19 routers (API endpoints)
│   │   ├── services/            # 18 service modules (business logic)
│   │   ├── ml_pipeline/         # ML training + inference
│   │   ├── core/                # Config, auth, cache, rate limiter
│   │   └── utils/               # Validation, LLM utilities
│   ├── config/                  # scoring.json, roles.json, skills.json
│   ├── models/                  # Trained ML artifacts
│   ├── tests/                   # Pytest test suite
│   └── requirements.txt
│
└── docs/                        # Documentation
```

---

## Code Conventions

### Backend (Python)

- **Formatter**: None enforced (follow PEP 8)
- **Linter**: Ruff (`ruff check app/ --select E,F,W --ignore E501`)
- **Type hints**: Use for function signatures
- **Logging**: Use `logging.getLogger(__name__)`
- **Error handling**: Re-raise `HTTPException` before generic `except Exception`
- **Naming**: `snake_case` for functions/variables, `PascalCase` for classes

### Frontend (TypeScript)

- **Formatter**: Prettier (default settings)
- **Linter**: TypeScript strict mode
- **Components**: `PascalCase` for components, `camelCase` for functions
- **State**: React Context + localStorage (no Redux)
- **Styling**: Tailwind CSS v4 with CSS variables
- **Icons**: Lucide React (not emoji)

---

## Adding a New API Endpoint

### 1. Create the Router

```python
# backend/app/routers/my_feature.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/my-feature", tags=["My Feature"])

class MyRequest(BaseModel):
    param: str

@router.post("/action")
async def my_action(req: MyRequest):
    """Endpoint description."""
    if not req.param:
        raise HTTPException(status_code=400, detail="param required.")
    return {"result": "success"}
```

### 2. Register in main.py

```python
# backend/app/main.py
from app.routers import my_feature

app.include_router(my_feature.router)
```

### 3. Add Rate Limiting (if needed)

```python
from app.core.rate_limiter import ai_limit, user_ai_limit

@router.post("/action")
@ai_limit
@user_ai_limit
async def my_action(request: Request, req: MyRequest):
    ...
```

### 4. Add Auth (if needed)

```python
from app.core.auth import get_current_user, AuthUser

@router.post("/action")
async def my_action(req: MyRequest, user: AuthUser = Depends(get_current_user)):
    ...
```

---

## Adding a New Frontend Page

### 1. Create the Page

```tsx
// frontend/src/pages/MyPage.tsx
import { useState, useEffect } from 'react';

export default function MyPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch data from API
  }, []);

  return (
    <div>
      <h1>My Page</h1>
      {/* Content */}
    </div>
  );
}
```

### 2. Add Route in App.tsx

```tsx
// frontend/src/App.tsx
const MyPage = lazy(() => import('./pages/MyPage'));

// In the Routes:
<Route path="/my-page" element={
  <RequireAuth><Layout><MyPage /></Layout></RequireAuth>
} />
```

### 3. Add Navigation (if needed)

Edit `frontend/src/components/Layout.tsx` to add the page to the sidebar navigation.

---

## Testing

### Backend Tests

```bash
cd backend
python -m pytest tests/ -v --tb=short
```

**Test files**:
- `test_auth.py` — Authentication and authorization
- `test_upload.py` — File upload validation
- `test_predict.py` — ML prediction endpoints
- `test_export.py` — History, analytics, export, GDPR
- `test_assessment.py` — Skill verification / assessment
- `test_core_pipeline.py` — Core scoring pipeline
- `test_integration.py` — End-to-end integration
- `test_session_recovery.py` — Session recovery
- `test_skill_proficiency.py` — Skill proficiency scoring

### Frontend Tests

```bash
cd frontend
npx vitest run
```

**Test files**:
- `src/test/history.test.ts` — History utility
- `src/test/sanitize.test.ts` — Input sanitization
- `src/test/storage.test.ts` — Local storage helpers
- `src/test/streakTracker.test.ts` — Streak tracking

### Writing New Tests

```python
# backend/tests/test_my_feature.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_my_endpoint():
    response = client.post("/my-feature/action", json={"param": "value"})
    assert response.status_code == 200
    assert response.json()["result"] == "success"
```

---

## Git Workflow

### Branch Naming

- `feature/description` — New features
- `fix/description` — Bug fixes
- `docs/description` — Documentation
- `refactor/description` — Code refactoring

### Commit Messages

Follow conventional commits:

```
feat: add market forecast endpoint
fix: resolve JWT verification in production
docs: update API reference
refactor: extract scoring logic into service
test: add auth endpoint tests
```

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Run tests: `pytest` and `vitest run`
4. Run linter: `ruff check app/`
5. Push and create a PR to `main`
6. CI will run lint + test + build
7. Request review

---

## Key Files to Know

| File | Purpose |
|---|---|
| `backend/app/main.py` | App factory, middleware, router registration |
| `backend/app/core/settings.py` | All environment variables |
| `backend/app/core/auth.py` | JWT verification |
| `backend/app/core/rate_limiter.py` | Rate limiting tiers |
| `backend/app/routers/analyze.py` | Resume upload endpoint |
| `backend/app/routers/ai_insight.py` | AI study/interview/curriculum endpoints |
| `backend/app/services/scoring_engine.py` | Deterministic scoring formula |
| `backend/app/services/skill_dictionary.py` | 147-skill fuzzy extraction |
| `backend/app/ml_pipeline/train_v2.py` | ML training pipeline |
| `backend/config/roles.json` | Role definitions (7 roles) |
| `backend/config/scoring.json` | Scoring weights + thresholds |
| `backend/config/skills.json` | 147 canonical skills + synonyms |
| `frontend/src/App.tsx` | Router, guards, context providers |
| `frontend/src/api/client.ts` | API client with retry + cache |
| `frontend/src/config/features.ts` | Feature flags |
| `frontend/src/context/ResumeContext.tsx` | Core app state |
| `frontend/src/components/Layout.tsx` | App shell + navigation |

---

## Getting Help

- **Swagger UI**: http://localhost:8000/docs — Interactive API documentation
- **Architecture**: [docs/ARCHITECTURE.md](ARCHITECTURE.md) — System design
- **API Reference**: [docs/API.md](API.md) — all 79 routes across 19 routers
- **Deployment**: [docs/DEPLOYMENT.md](DEPLOYMENT.md) — Setup guides
