"""
project_verifier_service.py — GitHub-based AI project verification.

Flow:
  1. Student submits a GitHub repo URL
  2. We fetch repo metadata, commit history, languages, file tree via GitHub public API
  3. Gemini AI cross-references the repo data against the original project spec
  4. Returns a verification report with score + proof points

This is a genuine differentiator — no career platform does automated
GitHub project verification with AI.
"""

import os
import re
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

import httpx
from google import genai

from app.core.settings import settings
from app.utils.llm_utils import parse_json_from_llm

log = logging.getLogger("project_verifier")

GITHUB_API = "https://api.github.com"
MAX_RETRIES = 3
INITIAL_BACKOFF = 2

# ── GitHub URL parser ───────────────────────────────────────────────────────

_GH_RE = re.compile(
    r"(?:https?://)?(?:www\.)?github\.com/(?P<owner>[A-Za-z0-9_.-]+)/(?P<repo>[A-Za-z0-9_.-]+)/?",
    re.IGNORECASE,
)


def parse_github_url(url: str) -> Optional[tuple[str, str]]:
    """Extract (owner, repo) from a GitHub URL. Returns None on bad input."""
    m = _GH_RE.match(url.strip())
    if not m:
        return None
    owner = m.group("owner")
    repo = m.group("repo").removesuffix(".git")
    return owner, repo


# ── GitHub data fetcher ─────────────────────────────────────────────────────

class GitHubFetcher:
    """Fetches repo data using the public GitHub REST API (no auth required
    for public repos, but an optional token doubles the rate limit)."""

    def __init__(self):
        token = os.getenv("GITHUB_TOKEN", "")
        self.headers: Dict[str, str] = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if token:
            self.headers["Authorization"] = f"Bearer {token}"

    async def fetch_repo(self, owner: str, repo: str) -> Dict[str, Any]:
        """Fetch all the data we need for verification in parallel."""
        cache_key = f"github:repo:{owner.lower()}:{repo.lower()}"

        # 1. Try L1 Cache first
        try:
            from app.core.cache import cache
            cached = cache.get(cache_key)
            if cached is not None:
                log.info("L1 Cache HIT for GitHub repo data: %s/%s", owner, repo)
                return cached
        except Exception as e:
            log.warning("GitHub L1 cache read error: %s", e)

        # 2. Fetch fresh data
        async with httpx.AsyncClient(
            headers=self.headers, timeout=15, follow_redirects=True
        ) as client:
            # Fire all requests in parallel
            repo_req = client.get(f"{GITHUB_API}/repos/{owner}/{repo}")
            commits_req = client.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/commits",
                params={"per_page": 30},
            )
            langs_req = client.get(f"{GITHUB_API}/repos/{owner}/{repo}/languages")
            tree_req = client.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/git/trees/HEAD",
                params={"recursive": "1"},
            )
            readme_req = client.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/readme",
                headers={**self.headers, "Accept": "application/vnd.github.raw+json"},
            )

            results = await asyncio.gather(
                repo_req, commits_req, langs_req, tree_req, readme_req,
                return_exceptions=True,
            )

        repo_resp, commits_resp, langs_resp, tree_resp, readme_resp = results

        # ── Repo metadata ───────────────────────────────────────────
        if isinstance(repo_resp, Exception) or repo_resp.status_code != 200:
            raise ValueError(
                f"Could not access repository github.com/{owner}/{repo}. "
                "Make sure the repo is public and the URL is correct."
            )
        repo_data = repo_resp.json()

        # ── Commits ─────────────────────────────────────────────────
        commits = []
        if not isinstance(commits_resp, Exception) and commits_resp.status_code == 200:
            for c in commits_resp.json():
                commits.append({
                    "sha": c["sha"][:7],
                    "message": c["commit"]["message"][:120],
                    "date": c["commit"]["author"]["date"],
                    "author": c["commit"]["author"]["name"],
                })

        # ── Languages ───────────────────────────────────────────────
        languages = {}
        if not isinstance(langs_resp, Exception) and langs_resp.status_code == 200:
            languages = langs_resp.json()  # {lang: bytes}

        # ── File tree ───────────────────────────────────────────────
        file_tree: List[str] = []
        if not isinstance(tree_resp, Exception) and tree_resp.status_code == 200:
            tree_data = tree_resp.json()
            file_tree = [
                item["path"]
                for item in tree_data.get("tree", [])
                if item["type"] == "blob"
            ][:200]  # Cap to avoid huge payloads

        # ── README ──────────────────────────────────────────────────
        readme = ""
        if not isinstance(readme_resp, Exception) and readme_resp.status_code == 200:
            readme = readme_resp.text[:3000]

        res = {
            "name": repo_data.get("name"),
            "description": repo_data.get("description", ""),
            "created_at": repo_data.get("created_at"),
            "updated_at": repo_data.get("updated_at"),
            "stars": repo_data.get("stargazers_count", 0),
            "default_branch": repo_data.get("default_branch", "main"),
            "has_issues": repo_data.get("has_issues", False),
            "topics": repo_data.get("topics", []),
            "commits": commits,
            "commit_count": len(commits),
            "languages": languages,
            "file_tree": file_tree,
            "file_count": len(file_tree),
            "readme": readme,
            "html_url": repo_data.get("html_url"),
        }

        # 3. Store in cache (5 minutes TTL)
        try:
            from app.core.cache import cache
            cache.set(cache_key, res, ttl=300)
            log.info("Cached GitHub repo data for %s/%s", owner, repo)
        except Exception as ce:
            log.warning("Failed to cache GitHub repo: %s", ce)

        return res


# ── Verification logic ──────────────────────────────────────────────────────

_fetcher = GitHubFetcher()


def _build_verification_prompt(
    repo_data: Dict[str, Any],
    project_markdown: str,
    required_skills: List[str],
) -> str:
    langs = ", ".join(repo_data["languages"].keys()) if repo_data["languages"] else "unknown"
    total_bytes = sum(repo_data["languages"].values()) if repo_data["languages"] else 0
    commit_msgs = "\n".join(
        f"  - [{c['sha']}] {c['date'][:10]}: {c['message']}"
        for c in repo_data["commits"][:15]
    )
    files_sample = "\n".join(f"  - {f}" for f in repo_data["file_tree"][:60])

    # Check if this is a frontend-centric repository to give target checklist guidelines
    is_frontend = any(lang.lower() in ["html", "css", "javascript", "typescript", "vue", "svelte"] for lang in repo_data["languages"].keys())

    frontend_checklist_instructions = ""
    if is_frontend:
        frontend_checklist_instructions = """
═══ CRITICAL FRONT-END CHECKLIST RULES ═══
Since this project involves Front-End technologies, you MUST evaluate the files and structure against the following checklist standards:
1. **HTML & SEO**: Ensure there are standard meta tags (especially `<meta name="viewport" ...>` for responsiveness, charset definitions, descriptive title, and meta description).
2. **Accessibility (a11y)**: Check if the file tree or README suggests semantic HTML5 tag utilization (`<header>`, `<nav>`, `<main>`, `<footer>`) instead of generic nested `<div>` blocks. Ensure image assets and README references include descriptive `alt` tags.
3. **Styles & Performance**: Are style definitions modular (e.g. CSS files, styled-components, or standard Tailwind configurations) rather than extensive inline styles?
4. **Best Practices**: Ensure clean asset organization (images/icons in dedicated directories like `public`, `assets`, or `images`).

Please factor these specific checks into your scores for `spec_alignment`, `documentation`, and `completeness`. Explicitly note any missed checklist items under 'improvements'.
"""

    return f"""
You are a strict but fair Senior Code Reviewer verifying if a student actually completed a capstone project.

═══ ORIGINAL PROJECT SPECIFICATION ═══
{project_markdown[:3000]}

═══ REQUIRED SKILLS TO DEMONSTRATE ═══
{', '.join(required_skills)}

═══ GITHUB REPOSITORY DATA ═══
Repository: {repo_data['name']}
Description: {repo_data['description']}
Created: {repo_data['created_at']}
Last Updated: {repo_data['updated_at']}
Languages: {langs} ({total_bytes:,} bytes total)
Total Files: {repo_data['file_count']}
Commits Fetched: {repo_data['commit_count']}

── Commit History (recent first) ──
{commit_msgs or '  No commits found'}

── File Tree (sample) ──
{files_sample or '  No files found'}

── README (excerpt) ──
{repo_data['readme'][:1500] or '  No README found'}
{frontend_checklist_instructions}

═══ YOUR TASK ═══
Analyze this repository against the original project specification, required skills, and any applicable checklist guidelines.
Score the project on these 5 criteria (0-100 each):

1. **skill_coverage** — Does the code use the required skills/technologies? Check file extensions, imports, frameworks visible in the tree and languages.
2. **spec_alignment** — How closely does the repo match the project specification and frontend design guidelines (if applicable)?
3. **code_authenticity** — Does the commit history show gradual, organic development? (Multiple commits over days? Or a single code dump?) Red flags: 1 commit, all files added at once, no meaningful commit messages.
4. **documentation** — Does the repo have a README, comments, proper structure, and good metadata?
5. **completeness** — Is this a working project or just boilerplate/scaffolding? (For front-end, look for viewport config, standard structural elements, and a11y focus).

Return ONLY valid JSON:
{{
    "overall_score": <number 0-100>,
    "verdict": "<VERIFIED | PARTIAL | INSUFFICIENT | SUSPICIOUS>",
    "skill_coverage": {{ "score": <0-100>, "detail": "<1-2 sentences>" }},
    "spec_alignment": {{ "score": <0-100>, "detail": "<1-2 sentences>" }},
    "code_authenticity": {{ "score": <0-100>, "detail": "<1-2 sentences>" }},
    "documentation": {{ "score": <0-100>, "detail": "<1-2 sentences>" }},
    "completeness": {{ "score": <0-100>, "detail": "<1-2 sentences>" }},
    "strengths": ["<strength 1>", "<strength 2>"],
    "improvements": ["<improvement 1>", "<improvement 2>"],
    "summary": "<2-3 sentence overall assessment>"
}}

Verdicts:
- VERIFIED (overall >= 75): Strong evidence project was completed authentically
- PARTIAL (50-74): Some work done, but significant gaps remain
- INSUFFICIENT (25-49): Minimal effort, mostly boilerplate
- SUSPICIOUS (< 25 or red flags): Possible plagiarism, single commit dump, or unrelated repo
"""



class ProjectVerifierService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

        # Bytez fallback client
        self._bytez_model = None
        bytez_key = os.getenv("BYTEZ_API_KEY", "")
        if bytez_key:
            try:
                import bytez as _bytez
                sdk = _bytez.Bytez(bytez_key)
                self._bytez_model = sdk.model(settings.BYTEZ_MODEL)
            except Exception as e:
                log.warning(f"Bytez fallback unavailable for verifier: {e}")

    async def verify_project(
        self,
        github_url: str,
        project_markdown: str,
        required_skills: List[str],
        role: str,
    ) -> Dict[str, Any]:
        """Full verification pipeline: fetch → analyze → AI score."""

        # ── 1. Parse URL ────────────────────────────────────────────
        parsed = parse_github_url(github_url)
        if not parsed:
            return {
                "verified": False,
                "error": "Invalid GitHub URL. Please provide a link like https://github.com/username/repo",
            }
        owner, repo = parsed

        # ── 2. Fetch repo data ──────────────────────────────────────
        try:
            repo_data = await _fetcher.fetch_repo(owner, repo)
        except ValueError as e:
            return {"verified": False, "error": str(e)}
        except Exception as e:
            log.error(f"GitHub fetch failed: {e}")
            return {
                "verified": False,
                "error": "Failed to fetch repository data. Please check the URL and try again.",
            }

        # ── 3. Quick sanity checks (before wasting an LLM call) ────
        if repo_data["file_count"] < 3:
            return {
                "verified": False,
                "error": "Repository has fewer than 3 files. Please submit a repository with actual project code.",
                "repo": repo_data["html_url"],
            }

        # ── 4. AI verification ──────────────────────────────────────
        if not self.client:
            # No Gemini key — do rule-based scoring only
            return self._rule_based_verification(repo_data, required_skills, role)

        prompt = _build_verification_prompt(repo_data, project_markdown, required_skills)
        ai_result = await self._call_gemini(prompt)

        # Bytez fallback if Gemini failed
        if not ai_result and self._bytez_model:
            log.info("Gemini unavailable for verify, trying Bytez...")
            ai_result = await self._call_bytez(prompt)

        if ai_result:
            ai_result["verified"] = True
            ai_result["repo"] = repo_data["html_url"]
            ai_result["repo_name"] = repo_data["name"]
            ai_result["languages"] = list(repo_data["languages"].keys())
            ai_result["commit_count"] = repo_data["commit_count"]
            ai_result["file_count"] = repo_data["file_count"]
            ai_result["verified_at"] = datetime.utcnow().isoformat()
            return ai_result

        # Final fallback: rule-based heuristic scoring
        log.info("All AI providers failed for verify, falling back to rule-based scoring")
        return self._rule_based_verification(repo_data, required_skills, role)

    async def _call_gemini(self, prompt: str) -> Optional[Dict[str, Any]]:
        backoff = INITIAL_BACKOFF
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = self.client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                )
                data = parse_json_from_llm(response.text)
                if data and "overall_score" in data:
                    return data
                log.warning("Gemini returned unparseable verification response")
                return None
            except Exception as e:
                err_str = str(e)
                is_rate_limit = "429" in err_str or "RESOURCE_EXHAUSTED" in err_str
                if is_rate_limit and attempt < MAX_RETRIES:
                    log.warning(f"Gemini 429 on verify attempt {attempt}, retrying in {backoff}s...")
                    await asyncio.sleep(backoff)
                    backoff *= 2
                else:
                    log.error(f"Gemini verify failed (attempt {attempt}): {e}")
                    return None
        return None

    async def _call_bytez(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Bytez fallback for verification when Gemini quota is exhausted."""
        try:
            res = self._bytez_model.run(
                [{"role": "user", "content": prompt}]
            )
            content = ""
            if isinstance(res, dict):
                content = (
                    res.get("output", {}).get("content", "")
                    if isinstance(res.get("output"), dict)
                    else str(res.get("output", ""))
                )
            elif hasattr(res, "output"):
                content = (
                    res.output.get("content", "")
                    if isinstance(res.output, dict)
                    else str(res.output)
                )
            else:
                content = str(res)

            if content:
                data = parse_json_from_llm(content)
                if data and "overall_score" in data:
                    return data
                log.warning("Bytez returned unparseable verification response")
        except Exception as e:
            log.error(f"Bytez verify fallback failed: {e}")
        return None

    def _rule_based_verification(
        self,
        repo_data: Dict[str, Any],
        required_skills: List[str],
        role: str,
    ) -> Dict[str, Any]:
        """Heuristic scoring when Gemini is unavailable."""
        score = 0
        details = {}

        # File count score
        fc = repo_data["file_count"]
        file_score = min(100, fc * 5) if fc > 0 else 0
        details["completeness"] = {
            "score": file_score,
            "detail": f"Repository contains {fc} files.",
        }
        score += file_score * 0.15

        # Commit count & pattern
        cc = repo_data["commit_count"]
        if cc >= 10:
            commit_score = 90
        elif cc >= 5:
            commit_score = 70
        elif cc >= 2:
            commit_score = 40
        else:
            commit_score = 10
        details["code_authenticity"] = {
            "score": commit_score,
            "detail": f"{cc} commits found. {'Good development pattern.' if cc >= 5 else 'Very few commits — may be a code dump.'}",
        }
        score += commit_score * 0.25

        # Language match against required skills
        repo_langs = set(lang.lower() for lang in repo_data["languages"].keys())
        repo_files = " ".join(repo_data["file_tree"]).lower()
        skill_hits = 0
        for skill in required_skills:
            s = skill.lower()
            if s in repo_langs or s in repo_files:
                skill_hits += 1
        skill_pct = (skill_hits / max(len(required_skills), 1)) * 100
        details["skill_coverage"] = {
            "score": int(skill_pct),
            "detail": f"Detected {skill_hits}/{len(required_skills)} required skills in repo languages/files.",
        }
        score += skill_pct * 0.30

        # README
        has_readme = bool(repo_data["readme"])
        doc_score = 80 if has_readme else 15
        details["documentation"] = {
            "score": doc_score,
            "detail": "README present." if has_readme else "No README found.",
        }
        score += doc_score * 0.15

        # Description
        has_desc = bool(repo_data.get("description"))
        spec_score = 60 if has_desc else 30
        details["spec_alignment"] = {
            "score": spec_score,
            "detail": "Basic repo description found." if has_desc else "No description set.",
        }
        score += spec_score * 0.15

        overall = int(score)
        if overall >= 75:
            verdict = "VERIFIED"
        elif overall >= 50:
            verdict = "PARTIAL"
        elif overall >= 25:
            verdict = "INSUFFICIENT"
        else:
            verdict = "SUSPICIOUS"

        return {
            "verified": True,
            "overall_score": overall,
            "verdict": verdict,
            **details,
            "strengths": [d["detail"] for d in details.values() if d["score"] >= 60],
            "improvements": [d["detail"] for d in details.values() if d["score"] < 60],
            "summary": f"Rule-based verification (AI unavailable). Score: {overall}/100. Detected {skill_hits}/{len(required_skills)} skills.",
            "repo": repo_data["html_url"],
            "repo_name": repo_data["name"],
            "languages": list(repo_data["languages"].keys()),
            "commit_count": repo_data["commit_count"],
            "file_count": repo_data["file_count"],
            "verified_at": datetime.utcnow().isoformat(),
            "is_rule_based": True,
        }


project_verifier_service = ProjectVerifierService()
