"""
data_loader.py (v2) — unified loader for real training data.

When Supabase is configured, loads from resume_analysis_synthetic_v2 table.
When Supabase is NOT configured, generates synthetic training data from roles.json config.

This allows the ML pipeline to train and run without any database.
"""

import json
import logging
import random
import time
from pathlib import Path

logger = logging.getLogger(__name__)

# ── Sample weights ─────────────────────────────────────────────────────────────
WEIGHT_REAL      = 1.5
WEIGHT_SYNTHETIC = 1.0

# ── TTL cache for dataset (avoids hitting Supabase on every ML endpoint) ──────
_dataset_cache: list[dict] | None = None
_dataset_cache_ts: float = 0

_combined_cache: list[dict] | None = None
_combined_cache_ts: float = 0

_NUMERIC_FIELDS = [
    "core_coverage_percent",
    "optional_coverage_percent",
    "project_score_percent",
    "ats_score_percent",
    "structure_score_percent",
]

# ── Paths ──────────────────────────────────────────────────────────────────────
_CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "config"


def _clean_record(row: dict, weight: float) -> dict | None:
    """Validate and normalise a raw Supabase row into a clean record dict."""
    skills = row.get("detected_skills") or []
    score  = row.get("final_score")

    if not isinstance(skills, list) or score is None:
        return None

    numeric = {
        field: int(row.get(field) or 0)
        for field in _NUMERIC_FIELDS
    }

    return {
        "detected_skills": [s.lower().strip() for s in skills if s],
        "role":            str(row.get("role", "Unknown")),
        "final_score":     int(score),
        **numeric,
        "sample_weight":   weight,
    }


def _generate_synthetic_data(count: int = 5000, seed: int = 42) -> list[dict]:
    """
    Generate synthetic training data from roles.json config.
    Each record simulates a resume with skills matching a specific role.
    """
    random.seed(seed)
    
    # Load roles config
    roles_file = _CONFIG_DIR / "roles.json"
    with open(roles_file, "r") as f:
        roles_config = json.load(f)
    
    records = []
    all_skills = list(roles_config.keys())
    
    for i in range(count):
        # Pick a random role
        role_name = random.choice(all_skills)
        role_skills = roles_config[role_name]
        
        # Generate skills: include most core skills, some optional skills
        detected_skills = []
        
        # Add 60-100% of core skills
        core_count = max(1, int(len(role_skills["core"]) * random.uniform(0.6, 1.0)))
        detected_skills.extend(random.sample(role_skills["core"], core_count))
        
        # Add 20-60% of optional skills
        optional_count = int(len(role_skills["optional"]) * random.uniform(0.2, 0.6))
        if optional_count > 0:
            detected_skills.extend(random.sample(role_skills["optional"], optional_count))
        
        # Add some random extra skills from other roles
        extra_count = random.randint(0, 3)
        other_skills = [s for s in all_skills if s != role_name]
        if other_skills and extra_count > 0:
            detected_skills.extend(random.sample(other_skills, min(extra_count, len(other_skills))))
        
        # Generate scores based on skill coverage
        core_coverage = (core_count / len(role_skills["core"])) * 100
        optional_coverage = (optional_count / max(1, len(role_skills["optional"]))) * 100
        
        # Add some noise
        core_coverage = max(0, min(100, core_coverage + random.uniform(-10, 10)))
        optional_coverage = max(0, min(100, optional_coverage + random.uniform(-10, 10)))
        
        project_score = random.uniform(40, 95)
        ats_score = random.uniform(50, 98)
        structure_score = random.uniform(60, 98)
        
        # Calculate final score based on config weights
        # From scoring.json: core=0.6, optional=0.15, project=0.15, ats=0.05, structure=0.05
        final_score = int(
            core_coverage * 0.6 +
            optional_coverage * 0.15 +
            project_score * 0.15 +
            ats_score * 0.05 +
            structure_score * 0.05
        )
        final_score = max(0, min(100, final_score + random.uniform(-5, 5)))
        
        record = {
            "detected_skills": list(set([s.lower() for s in detected_skills])),
            "role": role_name,
            "final_score": int(final_score),
            "core_coverage_percent": int(core_coverage),
            "optional_coverage_percent": int(optional_coverage),
            "project_score_percent": int(project_score),
            "ats_score_percent": int(ats_score),
            "structure_score_percent": int(structure_score),
            "sample_weight": 1.0,
        }
        records.append(record)
    
    logger.info(f"Generated {len(records)} synthetic training records from roles.json")
    return records


# ── Phase 4A loader (real data only) ──────────────────────────────────────────
def load_dataset() -> list[dict]:
    """
    Fetch role_analyses joined with resume detected_skills.
    Used by Phase 4A similarity / projection engines.
    Results cached for 5 minutes to avoid repeated Supabase calls.
    Falls back to synthetic data when Supabase is not configured.
    """
    global _dataset_cache, _dataset_cache_ts

    now = time.monotonic()
    if _dataset_cache is not None and (now - _dataset_cache_ts) < 300:
        return _dataset_cache

    try:
        from app.core.supabase_client import get_supabase, is_configured
        
        if not is_configured():
            # No Supabase - use synthetic data
            _dataset_cache = _generate_synthetic_data(2000)
            _dataset_cache_ts = now
            return _dataset_cache
        
        sb = get_supabase()

        analyses = (
            sb.table("role_analyses")
            .select("id, resume_id, role, final_score")
            .execute()
            .data or []
        )
        if not analyses:
            _dataset_cache = _generate_synthetic_data(2000)
            _dataset_cache_ts = now
            return _dataset_cache

        resume_ids   = list({a["resume_id"] for a in analyses})
        resumes_resp = (
            sb.table("resumes")
            .select("id, detected_skills")
            .in_("id", resume_ids)
            .execute()
        )
        resume_map = {
            r["id"]: (r.get("detected_skills") or [])
            for r in (resumes_resp.data or [])
        }

        records = []
        for a in analyses:
            skills = resume_map.get(a["resume_id"], [])
            score  = a.get("final_score")
            if score is None:
                continue
            records.append({
                "resume_id":       a["resume_id"],
                "analysis_id":     a["id"],
                "role":            a.get("role", "Unknown"),
                "final_score":     int(score),
                "detected_skills": [s.lower().strip() for s in skills if s],
            })

        _dataset_cache = records
        _dataset_cache_ts = now
        return records

    except Exception as e:
        logger.warning(f"Failed to load from Supabase: {e} - using synthetic data")
        _dataset_cache = _generate_synthetic_data(2000)
        _dataset_cache_ts = now
        return _dataset_cache


# ── Phase 4B loader (real + synthetic, with weights) ──────────────────────────
def load_combined_dataset() -> list[dict]:
    """
    Fetch and merge training data.
    Falls back to synthetic data when Supabase is not configured.
    """
    try:
        from app.core.supabase_client import get_supabase, is_configured
        
        if not is_configured():
            return _generate_synthetic_data(5000)
        
        sb = get_supabase()

        # ── Real data ─────────────────────────────────────────────────────────
        analyses = (
            sb.table("role_analyses")
            .select("*")
            .execute()
            .data or []
        )
        resume_ids   = list({a["resume_id"] for a in analyses})
        resumes_resp = (
            sb.table("resumes")
            .select("id, detected_skills")
            .in_("id", resume_ids)
            .execute()
            if resume_ids else type("R", (), {"data": []})()
        )
        resume_map = {
            r["id"]: (r.get("detected_skills") or [])
            for r in (resumes_resp.data or [])
        }

        real_records: list[dict] = []
        for a in analyses:
            merged = {**a, "detected_skills": resume_map.get(a["resume_id"], [])}
            rec    = _clean_record(merged, WEIGHT_REAL)
            if rec:
                real_records.append(rec)

        # ── Synthetic data ────────────────────────────────────────────────────
        synthetic_rows = (
            sb.table("resume_analysis_synthetic")
            .select("*")
            .execute()
            .data or []
        )
        synthetic_records: list[dict] = []
        for row in synthetic_rows:
            rec = _clean_record(row, WEIGHT_SYNTHETIC)
            if rec:
                synthetic_records.append(rec)

        combined = real_records + synthetic_records

        logger.info(
            f"Dataset loaded — "
            f"{len(real_records)} real (×{WEIGHT_REAL}) + "
            f"{len(synthetic_records)} synthetic (×{WEIGHT_SYNTHETIC}) "
            f"= {len(combined)} total"
        )
        return combined

    except Exception as e:
        logger.warning(f"Failed to load from Supabase: {e} - using synthetic data")
        return _generate_synthetic_data(5000)


# ── Phase 4B v2 loader (real + synthetic_v2 only) ─────────────────────────────

SYNTHETIC_V2_TABLE = "resume_analysis_synthetic_v2"


def _fetch_all_rows(sb, table: str, select: str = "*") -> list[dict]:
    """Fetch all rows from a Supabase table, handling pagination."""
    all_rows = []
    offset = 0
    batch = 1000
    while True:
        resp = (
            sb.table(table)
            .select(select)
            .range(offset, offset + batch - 1)
            .execute()
        )
        rows = resp.data or []
        all_rows.extend(rows)
        if len(rows) < batch:
            break
        offset += batch
    return all_rows


def _fetch_real_records(sb) -> tuple[list[dict], int]:
    """Shared helper: fetch real role_analyses joined with resume skills."""
    analyses = (
        sb.table("role_analyses")
        .select("*")
        .execute()
        .data or []
    )
    if not analyses:
        return [], 0

    resume_ids   = list({a["resume_id"] for a in analyses})
    resumes_resp = (
        sb.table("resumes")
        .select("id, detected_skills")
        .in_("id", resume_ids)
        .execute()
        if resume_ids else type("R", (), {"data": []})()
    )
    resume_map = {
        r["id"]: (r.get("detected_skills") or [])
        for r in (resumes_resp.data or [])
    }

    records: list[dict] = []
    for a in analyses:
        merged = {**a, "detected_skills": resume_map.get(a["resume_id"], [])}
        rec    = _clean_record(merged, WEIGHT_REAL)
        if rec:
            records.append(rec)

    return records, len(records)


def load_combined_dataset_v2() -> list[dict]:
    """
    Fetch and merge training data.
    Falls back to synthetic data when Supabase is not configured.
    """
    try:
        from app.core.supabase_client import get_supabase, is_configured
        
        if not is_configured():
            return _generate_synthetic_data(5000)
        
        sb = get_supabase()

        real_records, real_count = _fetch_real_records(sb)

        # ── Training data from v2 table ──────────────────────────────────────
        training_rows = _fetch_all_rows(sb, SYNTHETIC_V2_TABLE)
        training_records: list[dict] = []
        for row in training_rows:
            # Real dataset records get real weight; synthetic get synthetic weight
            dtype = row.get("data_type", "synthetic_v2")
            weight = WEIGHT_REAL if dtype == "real_dataset" else WEIGHT_SYNTHETIC
            rec = _clean_record(row, weight)
            if rec:
                training_records.append(rec)

        combined = real_records + training_records

        real_dataset_count = sum(1 for r in training_records if r.get("sample_weight") == WEIGHT_REAL)
        logger.info(
            f"Dataset v2 loaded — "
            f"{real_count} user resumes (x{WEIGHT_REAL}) + "
            f"{len(training_records)} training data ({real_dataset_count} real, "
            f"{len(training_records) - real_dataset_count} synthetic) "
            f"= {len(combined)} total"
        )
        return combined

    except Exception as e:
        logger.warning(f"Failed to load from Supabase: {e} - using synthetic data")
        return _generate_synthetic_data(5000)
