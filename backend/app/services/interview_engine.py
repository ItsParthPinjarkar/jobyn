"""
interview_engine.py — rule-based interview Q&A evaluation.

Question bank: 5 questions per role (6 roles = 30 questions).
Evaluation: keyword/concept matching + structured feedback.
No LLM required — runs fully on-device / backend.
"""

from __future__ import annotations
import random
from typing import Optional
from app.core.config_loader import load_skills

_SKILLS: dict | None = None
def _get_skills():
    global _SKILLS
    if _SKILLS is None:
        try:
            _SKILLS = load_skills()
        except Exception:
            _SKILLS = {}
    return _SKILLS

# ── Question Bank ─────────────────────────────────────────────────────────────
# Each question has: id, question text, expected_concepts, difficulty, tip

QUESTION_BANK: dict[str, list[dict]] = {

  "Software Developer": [
    {
      "id": "sd_001",
      "question": "Explain how a HashMap (or Python dict) works internally.",
      "concepts": ["hash function","collision","bucket","key","value","load factor","O(1)","equals","hashcode"],
      "difficulty": "Intermediate",
      "tip": "Cover hashing, collision resolution (chaining/open-addressing), and time complexity.",
    },
    {
      "id": "sd_002",
      "question": "What is the difference between SQL JOINs (INNER, LEFT, RIGHT, FULL)?",
      "concepts": ["inner join","left join","right join","full join","null","matching rows","cartesian","foreign key","on clause"],
      "difficulty": "Beginner",
      "tip": "Use a diagram mentally: which rows survive each join type.",
    },
    {
      "id": "sd_003",
      "question": "Explain REST API design principles and HTTP methods.",
      "concepts": ["stateless","get","post","put","delete","patch","status code","endpoint","json","idempotent","resource"],
      "difficulty": "Intermediate",
      "tip": "Cover statelessness, correct HTTP verbs, and status codes like 200, 201, 400, 404, 500.",
    },
    {
      "id": "sd_004",
      "question": "What is the time complexity of QuickSort? When does it degrade?",
      "concepts": ["O(n log n)","pivot","partition","worst case","O(n^2)","sorted array","randomized","space complexity","divide and conquer"],
      "difficulty": "Intermediate",
      "tip": "Mention average O(n log n), worst case O(n²) with bad pivot (sorted input), and mitigation via random pivot.",
    },
    {
      "id": "sd_005",
      "question": "What is the difference between process and thread? When would you use each?",
      "concepts": ["process","thread","memory","shared","isolation","context switch","GIL","synchronization","race condition","mutex","concurrent"],
      "difficulty": "Advanced",
      "tip": "Processes are isolated; threads share memory. Cover context switching overhead and synchronization.",
    },
  ],

  "Frontend Developer": [
    {
      "id": "fe_001",
      "question": "Explain the React component lifecycle and useEffect hook.",
      "concepts": ["mount","unmount","update","useEffect","dependency array","cleanup","side effects","render","state","props"],
      "difficulty": "Intermediate",
      "tip": "Cover mounting, updating, unmounting phases and how useEffect maps to each with dependency array.",
    },
    {
      "id": "fe_002",
      "question": "What is the virtual DOM and how does React's reconciliation work?",
      "concepts": ["virtual DOM","diffing","reconciliation","fiber","re-render","key","patch","real DOM","performance"],
      "difficulty": "Intermediate",
      "tip": "Explain diffing algorithm, importance of 'key' prop, and how React batches updates.",
    },
    {
      "id": "fe_003",
      "question": "What is CSS specificity and how does it affect styling?",
      "concepts": ["specificity","inline style","id","class","element","!important","specificity score","cascade","inheritance"],
      "difficulty": "Beginner",
      "tip": "Use the 0-0-0-0 notation: inline > ID > class/attribute > element.",
    },
    {
      "id": "fe_004",
      "question": "How does browser rendering work from HTML to pixels?",
      "concepts": ["DOM","CSSOM","render tree","layout","paint","composite","JavaScript engine","critical rendering path","reflow","repaint"],
      "difficulty": "Advanced",
      "tip": "Cover DOM → CSSOM → Render Tree → Layout → Paint → Composite pipeline.",
    },
    {
      "id": "fe_005",
      "question": "What is the difference between localStorage, sessionStorage, and cookies?",
      "concepts": ["localStorage","sessionStorage","cookie","expiry","httpOnly","secure","domain","4KB","5MB","session","persistent"],
      "difficulty": "Beginner",
      "tip": "Cover size, persistence, server accessibility (cookies only), and security flags.",
    },
  ],

  "Backend Developer": [
    {
      "id": "be_001",
      "question": "Explain database indexing and when you would use a composite index.",
      "concepts": ["index","B-tree","query performance","O(log n)","composite index","selectivity","scan","write overhead","WHERE clause","ORDER BY"],
      "difficulty": "Intermediate",
      "tip": "Indexes speed up reads but slow writes. Composite index column order matters (leftmost prefix rule).",
    },
    {
      "id": "be_002",
      "question": "What is database normalization? Explain 1NF, 2NF, and 3NF.",
      "concepts": ["1NF","2NF","3NF","atomic","repeating groups","partial dependency","transitive dependency","primary key","foreign key","redundancy"],
      "difficulty": "Intermediate",
      "tip": "1NF: atomic values. 2NF: no partial dependencies. 3NF: no transitive dependencies.",
    },
    {
      "id": "be_003",
      "question": "How does JWT authentication work? What are its weaknesses?",
      "concepts": ["header","payload","signature","secret","expiry","stateless","refresh token","HMAC","RS256","replay attack","revocation"],
      "difficulty": "Intermediate",
      "tip": "Structure: header.payload.signature. Weakness: cannot invalidate without blocklist. Mention short expiry + refresh tokens.",
    },
    {
      "id": "be_004",
      "question": "What is caching? Explain cache invalidation strategies.",
      "concepts": ["cache","Redis","TTL","LRU","write-through","write-back","invalidation","cache aside","warm up","hit rate","eviction"],
      "difficulty": "Advanced",
      "tip": "Cover cache-aside vs write-through, TTL, LRU eviction, and the 'hard parts' of cache invalidation.",
    },
    {
      "id": "be_005",
      "question": "Explain the CAP theorem and how it applies to database selection.",
      "concepts": ["CAP","consistency","availability","partition tolerance","eventual consistency","MongoDB","Cassandra","PostgreSQL","trade-off","distributed"],
      "difficulty": "Advanced",
      "tip": "CP: PostgreSQL. AP: Cassandra. In practice, partition tolerance is mandatory; choose C vs A trade-off.",
    },
  ],

  "Full Stack Developer": [
    {
      "id": "fs_001",
      "question": "What happens when you type a URL in the browser and press Enter?",
      "concepts": ["DNS","TCP","TLS","HTTP","GET","HTML","CSS","JavaScript","rendering","IP","CDN","SSL handshake","200"],
      "difficulty": "Intermediate",
      "tip": "Cover DNS lookup → TCP connection → TLS handshake → HTTP request → HTML parse → render pipeline.",
    },
    {
      "id": "fs_002",
      "question": "Explain microservices vs monolith architecture. When to use each?",
      "concepts": ["microservices","monolith","scalability","deployment","coupling","independent","Docker","API gateway","latency","team size","complexity"],
      "difficulty": "Advanced",
      "tip": "Monolith is simpler for small teams. Microservices add operational complexity but enable independent scaling.",
    },
    {
      "id": "fs_003",
      "question": "What is CORS and how do you resolve it?",
      "concepts": ["CORS","origin","preflight","OPTIONS","Access-Control-Allow-Origin","same-origin","browser policy","headers","credentials"],
      "difficulty": "Beginner",
      "tip": "CORS is a browser security policy. Server must send correct Allow-Origin headers. Preflight OPTIONS for non-simple requests.",
    },
    {
      "id": "fs_004",
      "question": "How do you optimize a slow database query?",
      "concepts": ["index","EXPLAIN","query plan","N+1","join","subquery","pagination","limit","projection","composite index","cache"],
      "difficulty": "Intermediate",
      "tip": "Use EXPLAIN/ANALYZE, add indexes on WHERE/JOIN columns, avoid N+1, limit columns (SELECT specific), add pagination.",
    },
    {
      "id": "fs_005",
      "question": "What is CI/CD? Describe a typical pipeline.",
      "concepts": ["continuous integration","continuous delivery","pipeline","build","test","lint","docker","deploy","artifact","staging","rollback","GitHub Actions"],
      "difficulty": "Intermediate",
      "tip": "Steps: commit → lint → unit test → build → containerize → deploy staging → smoke test → prod deploy.",
    },
  ],

  "Data Scientist": [
    {
      "id": "ds_001",
      "question": "Explain the bias-variance trade-off in machine learning.",
      "concepts": ["bias","variance","overfitting","underfitting","training error","test error","model complexity","regularization","cross-validation","generalization"],
      "difficulty": "Intermediate",
      "tip": "High bias = underfitting (simple model). High variance = overfitting (memorizes data). Use regularization/cross-val to balance.",
    },
    {
      "id": "ds_002",
      "question": "What is the difference between L1 and L2 regularization?",
      "concepts": ["L1","L2","Lasso","Ridge","sparsity","feature selection","coefficient","penalty","gradient","shrinkage"],
      "difficulty": "Intermediate",
      "tip": "L1 (Lasso) drives coefficients to 0 → feature selection. L2 (Ridge) shrinks uniformly → no feature elimination.",
    },
    {
      "id": "ds_003",
      "question": "How do you handle class imbalance in a classification problem?",
      "concepts": ["SMOTE","oversampling","undersampling","class_weight","F1","precision","recall","AUC","threshold","confusion matrix","synthetic"],
      "difficulty": "Intermediate",
      "tip": "Never just use accuracy. Use F1-macro/AUC. Techniques: SMOTE, class_weight='balanced', threshold tuning.",
    },
    {
      "id": "ds_004",
      "question": "Explain how a Random Forest works and its key hyperparameters.",
      "concepts": ["ensemble","bagging","decision tree","bootstrap","n_estimators","max_depth","feature importance","OOB score","majority vote","random feature subset"],
      "difficulty": "Intermediate",
      "tip": "RF = bagged decision trees with random feature subsets. Key params: n_estimators, max_depth, min_samples_leaf.",
    },
    {
      "id": "ds_005",
      "question": "What is the difference between PCA and t-SNE? When to use each?",
      "concepts": ["PCA","t-SNE","dimensionality reduction","variance","eigenvector","visualization","linear","non-linear","perplexity","high-dimensional"],
      "difficulty": "Advanced",
      "tip": "PCA: linear, preserves global structure, use for preprocessing. t-SNE: non-linear, use for 2D visualization only.",
    },
  ],

  "ML Engineer": [
    {
      "id": "ml_001",
      "question": "What is the difference between a data scientist and an ML engineer?",
      "concepts": ["production","deployment","serving","MLOps","model monitoring","data scientist","experimentation","pipeline","scalability","CI/CD","Docker"],
      "difficulty": "Beginner",
      "tip": "DS focuses on experimentation/modeling. MLE focuses on production deployment, monitoring, and scalable serving.",
    },
    {
      "id": "ml_002",
      "question": "Explain model drift and how you detect and handle it.",
      "concepts": ["data drift","concept drift","prediction drift","monitoring","PSI","KL divergence","retraining","alert","shadow mode","baseline"],
      "difficulty": "Advanced",
      "tip": "Data drift: input distribution changes. Concept drift: relationship changes. Detect via PSI/KL on features. Retrain on schedule.",
    },
    {
      "id": "ml_003",
      "question": "How do you serve an ML model in production? What is model serving?",
      "concepts": ["REST","FastAPI","Flask","Docker","Kubernetes","batch","real-time","latency","throughput","ONNX","TensorRT","model registry"],
      "difficulty": "Intermediate",
      "tip": "Real-time serving via REST (FastAPI/Flask in Docker). Batch serving via queues. ONNX for cross-framework optimization.",
    },
    {
      "id": "ml_004",
      "question": "What is feature engineering and why does it matter more than model choice?",
      "concepts": ["feature","encoding","normalization","one-hot","embedding","interaction","domain knowledge","leakage","train-test","imputation","scaling"],
      "difficulty": "Intermediate",
      "tip": "Good features > complex models. Common mistakes: leakage (future data in train), not scaling, poor handling of nulls.",
    },
    {
      "id": "ml_005",
      "question": "Explain attention mechanism in Transformers.",
      "concepts": ["attention","query","key","value","softmax","dot product","multi-head","self-attention","positional encoding","transformer","BERT","GPT"],
      "difficulty": "Advanced",
      "tip": "Attention: score(Q·Kᵀ/√d) → softmax → weighted V. Multi-head = multiple attention streams. Positional encoding adds order info.",
    },
  ],

  "DevOps Engineer": [
    {
      "id": "do_001",
      "question": "Explain the difference between Docker and a Virtual Machine.",
      "concepts": ["container","VM","kernel","host OS","hypervisor","image","lightweight","isolation","process","namespace","cgroup","overhead"],
      "difficulty": "Beginner",
      "tip": "VM = full OS per instance (heavy). Docker = isolated process sharing host kernel (lightweight, seconds to start).",
    },
    {
      "id": "do_002",
      "question": "What is Kubernetes and how does it manage containers?",
      "concepts": ["pod","node","cluster","scheduler","deployment","service","ingress","replica","rolling update","health check","ConfigMap","namespace"],
      "difficulty": "Intermediate",
      "tip": "K8s: orchestrates containers across nodes. Pod = smallest unit. Deployment manages replicas. Service = stable DNS endpoint.",
    },
    {
      "id": "do_003",
      "question": "What is Infrastructure as Code (IaC)? How does Terraform work?",
      "concepts": ["IaC","Terraform","state","plan","apply","provider","resource","module","idempotent","drift","declarative","HCL"],
      "difficulty": "Intermediate",
      "tip": "IaC: manage infra via code files (version-controlled). Terraform: plan shows changes; apply executes; state tracks reality.",
    },
    {
      "id": "do_004",
      "question": "What is a reverse proxy? How does Nginx work?",
      "concepts": ["reverse proxy","Nginx","load balancing","upstream","SSL termination","caching","proxy_pass","location","upstream","worker process","round-robin"],
      "difficulty": "Intermediate",
      "tip": "Nginx sits in front of app servers: handles SSL, load balancing, static file serving. proxy_pass forwards to backend.",
    },
    {
      "id": "do_005",
      "question": "Explain blue-green deployment and canary releases.",
      "concepts": ["blue-green","canary","rollback","traffic split","zero downtime","deployment","production","staging","feature flag","health check"],
      "difficulty": "Intermediate",
      "tip": "Blue-green: switch 100% traffic at once (fast rollback). Canary: gradually shift % of traffic (safer, slower rollback).",
    },
  ],
}


# ── Core evaluation function ──────────────────────────────────────────────────

def get_questions_for_role(role: str) -> list[dict]:
    """Return list of questions for a role (fuzzy match)."""
    # Exact match first
    if role in QUESTION_BANK:
        return QUESTION_BANK[role]
    # Fuzzy match
    role_lower = role.lower()
    for key in QUESTION_BANK:
        if any(word in role_lower for word in key.lower().split()):
            return QUESTION_BANK[key]
    # Default
    return QUESTION_BANK["Software Developer"]


def get_random_question(role: str) -> dict:
    questions = get_questions_for_role(role)
    return random.choice(questions)


def get_question_by_id(role: str, question_id: str) -> Optional[dict]:
    for q in get_questions_for_role(role):
        if q["id"] == question_id:
            return q
    return None


def evaluate_answer(role: str, question_id: str, answer_text: str) -> dict:
    """
    Score an interview answer.

    Returns:
        score (0–100), detected_concepts, missing_concepts,
        feedback (str), grade (str), learning_path (list)
    """
    question = get_question_by_id(role, question_id)
    if not question:
        # Try to find any question if ID doesn't match
        questions = get_questions_for_role(role)
        if questions:
            question = questions[0]
        else:
            return {"error": "Question not found"}

    answer_lower = answer_text.lower()
    concepts     = question["concepts"]
    skills_map   = _get_skills()

    detected = []
    for c in concepts:
        # 1. Exact match for concept
        if c.lower() in answer_lower:
            detected.append(c)
            continue

        # 2. Check synonyms if concept exists in our skills dictionary
        syns = skills_map.get(c.lower(), [])
        if any(s.lower() in answer_lower for s in syns):
            detected.append(c)

    missing = [c for c in concepts if c not in detected]

    raw_score = len(detected) / len(concepts) * 100 if concepts else 0
    score     = round(raw_score)

    # Grade
    if score >= 80:
        grade = "Excellent"
    elif score >= 60:
        grade = "Good"
    elif score >= 40:
        grade = "Developing"
    else:
        grade = "Needs Practice"

    # Feedback
    feedback = _generate_feedback(score, detected, missing, question)

    # Diagnostic Learning Path Generation
    learning_path = []
    if score < 70 and missing: # Flag as genuine knowledge gap
        for concept in missing[:2]:
            learning_path.append({
                "concept": concept,
                "resource": f"https://www.youtube.com/results?search_query={concept.replace(' ', '+')}+tutorial",
                "type": "video"
            })
            learning_path.append({
                "concept": concept,
                "resource": f"https://www.google.com/search?q={concept.replace(' ', '+')}+best+practices+documentation",
                "type": "docs"
            })

    return {
        "score":             score,
        "grade":             grade,
        "detected_concepts": detected,
        "missing_concepts":  missing[:5],   # top 5 to improve
        "total_concepts":    len(concepts),
        "feedback":          feedback,
        "tip":               question.get("tip", ""),
        "question":          question["question"],
        "difficulty":        question.get("difficulty", "Intermediate"),
        "diagnostic_flag":   score < 70, # Flag it if they fail
        "learning_path":     learning_path
    }


def _generate_feedback(score: int, detected: list, missing: list, question: dict) -> str:
    """Generate human-readable feedback string."""
    if score >= 80:
        feedback = f"Great answer! You covered {len(detected)} out of {len(detected)+len(missing)} key concepts."
        if missing:
            feedback += f" To make it perfect, also mention: {', '.join(missing[:3])}."
    elif score >= 60:
        feedback = f"Good response — you covered the basics ({len(detected)} concepts)."
        if missing:
            feedback += f" Strengthen your answer by adding: {', '.join(missing[:3])}."
    elif score >= 40:
        feedback = f"You mentioned {len(detected)} concepts but missed important ones."
        if missing:
            feedback += f" Focus on: {', '.join(missing[:4])}."
        feedback += f" Tip: {question.get('tip', '')}"
    else:
        feedback = "Your answer needs more technical depth."
        if missing:
            feedback += f" Key topics to cover: {', '.join(missing[:5])}."
        feedback += f" Hint: {question.get('tip', '')}"
    return feedback
