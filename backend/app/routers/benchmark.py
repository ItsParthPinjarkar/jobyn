"""
benchmark.py — peer benchmarking endpoints.

Computes percentile benchmarks for a given role based on all historical
role_analyses, and shows where the authenticated user falls among peers.
"""

from fastapi import APIRouter, HTTPException, Depends
from app.core.auth import get_current_user, AuthUser
from app.core.supabase_client import get_supabase
from statistics import mean, median
import logging

log = logging.getLogger(__name__)

router = APIRouter(prefix="/benchmarks", tags=["Benchmarks"])


def _percentile(sorted_values: list, p: float) -> float:
    """
    Compute the p-th percentile (0-100) from a pre-sorted list
    using the nearest-rank method.
    """
    if not sorted_values:
        return 0.0
    k = (p / 100) * (len(sorted_values) - 1)
    lower = int(k)
    frac = k - lower
    if lower + 1 < len(sorted_values):
        return sorted_values[lower] + frac * (sorted_values[lower + 1] - sorted_values[lower])
    return sorted_values[lower]


@router.get("/{role}")
async def get_benchmark(
    role: str,
    user: AuthUser = Depends(get_current_user),
):
    """
    Return peer benchmarks for a role.

    Queries all role_analyses for the given role, computes percentile
    distribution, and calculates where the current user's latest score
    falls.  Results are cached in the peer_benchmarks table via upsert.
    """
    try:
        sb = get_supabase()

        # ── Fetch all analyses for this role ────────────────────────────
        analyses_resp = (
            sb.table("role_analyses")
            .select("id, resume_id, final_score")
            .eq("role", role)
            .execute()
        )

        analyses = analyses_resp.data or []

        if not analyses:
            raise HTTPException(
                status_code=404,
                detail=f"No analyses found for role '{role}'.",
            )

        scores = [a["final_score"] for a in analyses if a.get("final_score") is not None]
        scores.sort()

        if not scores:
            raise HTTPException(
                status_code=404,
                detail=f"No valid scores found for role '{role}'.",
            )

        # ── Compute percentiles ────────────────────────────────────────
        avg_score = round(mean(scores), 1)
        median_score = round(median(scores), 1)
        p10 = round(_percentile(scores, 10), 1)
        p25 = round(_percentile(scores, 25), 1)
        p50 = round(_percentile(scores, 50), 1)
        p75 = round(_percentile(scores, 75), 1)
        p90 = round(_percentile(scores, 90), 1)

        # ── User's percentile ──────────────────────────────────────────
        # Find the user's latest score for this role
        user_percentile = None
        user_score = None

        # Get the user's resume IDs
        user_resumes_resp = (
            sb.table("resumes")
            .select("id")
            .eq("user_email", user.email)
            .execute()
        )
        user_resume_ids = [r["id"] for r in (user_resumes_resp.data or [])]

        if user_resume_ids:
            user_analysis_resp = (
                sb.table("role_analyses")
                .select("final_score")
                .eq("role", role)
                .in_("resume_id", user_resume_ids)
                .order("id", desc=True)
                .limit(1)
                .execute()
            )

            if user_analysis_resp.data:
                user_score = user_analysis_resp.data[0].get("final_score")

        if user_score is not None:
            below_count = sum(1 for s in scores if s < user_score)
            user_percentile = round((below_count / len(scores)) * 100, 1)

        # ── Cache in peer_benchmarks (upsert) ──────────────────────────
        benchmark_record = {
            "role": role,
            "total_analyses": len(scores),
            "avg_score": avg_score,
            "median_score": median_score,
            "p10_score": p10,
            "p25_score": p25,
            "p50_score": p50,
            "p75_score": p75,
            "p90_score": p90,
        }

        try:
            sb.table("peer_benchmarks").upsert(
                benchmark_record,
                on_conflict="role",
            ).execute()
        except Exception as cache_err:
            log.warning("Failed to cache benchmark for role '%s': %s", role, cache_err)

        return {
            "role": role,
            "total_analyses": len(scores),
            "avg_score": avg_score,
            "median_score": median_score,
            "p10_score": p10,
            "p25_score": p25,
            "p50_score": p50,
            "p75_score": p75,
            "p90_score": p90,
            "user_percentile": user_percentile,
            "user_score": user_score,
        }

    except HTTPException:
        raise
    except EnvironmentError:
        raise HTTPException(status_code=503, detail="Database not configured.")
    except Exception:
        log.exception("Benchmark computation failed")
        raise HTTPException(status_code=500, detail="An internal error occurred. Please try again.")
