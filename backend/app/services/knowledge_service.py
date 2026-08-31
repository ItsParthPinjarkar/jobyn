"""
knowledge_service.py — knowledge cache backed by Supabase (L2) and Redis (L1).

Reads / writes from the ``knowledge_cache`` table in Supabase.
Falls back gracefully when Supabase is unavailable (returns None / logs warning).
Uses a fast L1 Cache layer to bypass database roundtrips.
"""

import logging
from typing import Optional, Dict, Any
from app.core.cache import cache

log = logging.getLogger("knowledge_service")

# Bump this when prompts change significantly to auto-invalidate stale cache
CACHE_VERSION = 4


def _sb():
    from app.core.supabase_client import get_supabase
    return get_supabase()


class KnowledgeService:
    def get_cached_knowledge(self, topic: str, type: str = "study") -> Optional[Dict[str, Any]]:
        """
        Retrieves cached AI content (notes or quiz) from L1 Cache or Supabase ``knowledge_cache``.
        Automatically rejects stale entries from older cache versions.
        """
        cache_key = f"knowledge:{type}:{topic.lower()}"

        # 1. Try L1 cache (Redis/Memory)
        try:
            cached_content = cache.get(cache_key)
            if cached_content is not None:
                if cached_content.get("_cache_version", 0) < CACHE_VERSION:
                    log.info("L1 Cache STALE for %s (%s) — version %s < %s, deleting",
                             topic, type, cached_content.get("_cache_version", 0), CACHE_VERSION)
                    cache.delete(cache_key)
                else:
                    log.info("L1 Cache HIT for %s (%s)", topic, type)
                    return cached_content
        except Exception as e:
            log.warning("Knowledge L1 cache read error: %s", e)

        # 2. Try L2 database (Supabase)
        try:
            sb = _sb()
            resp = (
                sb.table("knowledge_cache")
                .select("content")
                .eq("topic", topic.lower())
                .eq("type", type)
                .limit(1)
                .execute()
            )
            if resp.data:
                content = resp.data[0]["content"]
                # Reject stale cache entries from older versions
                if content.get("_cache_version", 0) < CACHE_VERSION:
                    log.info("Supabase cache STALE for %s (%s) — version %s < %s, will regenerate",
                             topic, type, content.get("_cache_version", 0), CACHE_VERSION)
                    return None

                # Cache in L1 for future fast hits (24 hours TTL)
                log.info("Supabase cache HIT for %s (%s). Writing to L1 Cache.", topic, type)
                try:
                    cache.set(cache_key, content, ttl=86400)
                except Exception as e:
                    log.warning("Failed to write %s (%s) to L1 Cache: %s", topic, type, e)
                return content
        except Exception as e:
            log.warning("Knowledge cache read error: %s", e)
        return None

    def cache_knowledge(self, topic: str, content: Dict[str, Any], type: str = "study"):
        """
        Upserts AI content into the Supabase ``knowledge_cache`` table and sets L1 cache.
        Stamps content with the current cache version for future invalidation.
        Gracefully handles RLS / permission errors — logs a warning and continues.
        """
        content["_cache_version"] = CACHE_VERSION
        cache_key = f"knowledge:{type}:{topic.lower()}"

        # 1. Update L1 Cache
        try:
            cache.set(cache_key, content, ttl=86400)
            log.info("Cached %s (%s) v%s to L1 Cache", topic, type, CACHE_VERSION)
        except Exception as e:
            log.warning("Failed to write %s (%s) to L1 Cache: %s", topic, type, e)

        # 2. Update L2 DB (Supabase)
        try:
            sb = _sb()
            sb.table("knowledge_cache").upsert(
                {
                    "topic": topic.lower(),
                    "type": type,
                    "content": content,
                    "updated_at": "now()",
                },
                on_conflict="topic,type",
            ).execute()
            log.info("Cached %s (%s) v%s to Supabase", topic, type, CACHE_VERSION)
        except Exception as e:
            err_str = str(e)
            if "row-level security" in err_str or "401" in err_str or "403" in err_str:
                log.warning("Knowledge cache write skipped (RLS policy): %s (%s)", topic, type)
            else:
                log.warning("Knowledge cache write error: %s", e)

    def get_all_topics_count(self) -> int:
        """Return number of distinct topics in the knowledge cache."""
        cache_key = "knowledge:topics_count"
        try:
            cached_count = cache.get(cache_key)
            if cached_count is not None:
                return cached_count
        except Exception as e:
            log.warning("Failed to read topics count from L1 Cache: %s", e)

        try:
            sb = _sb()
            resp = sb.table("knowledge_cache").select("topic").execute()
            count = len({row["topic"] for row in resp.data})
            try:
                cache.set(cache_key, count, ttl=3600)  # Cache for 1 hour
            except Exception as ce:
                log.warning("Failed to cache topics count: %s", ce)
            return count
        except Exception as e:
            log.warning("Knowledge topics count error: %s", e)
            return 0


knowledge_service = KnowledgeService()
