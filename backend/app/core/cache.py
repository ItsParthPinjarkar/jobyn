"""
cache.py — Unified caching layer with Redis + in-memory fallback.

Usage:
    from app.core.cache import cache

    cache.set("forecast:swe", data, ttl=3600)
    result = cache.get("forecast:swe")
    cache.delete("forecast:swe")

When ``REDIS_URL`` is set and Redis is reachable, data is stored there.
Otherwise, an in-memory dict with TTL eviction is used transparently.
"""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Any

logger = logging.getLogger(__name__)

_PREFIX = "cse:"   # namespace prefix for all keys


# ── In-memory fallback store ───────────────────────────────────────────────────

class _MemoryStore:
    """Thread-safe-ish TTL dict (good enough for single-process uvicorn)."""

    def __init__(self) -> None:
        self._data: dict[str, tuple[float, str]] = {}  # key → (expires_at, json_str)

    def get(self, key: str) -> Any | None:
        entry = self._data.get(key)
        if entry is None:
            return None
        expires_at, raw = entry
        if time.time() > expires_at:
            del self._data[key]
            return None
        return json.loads(raw)

    def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        self._data[key] = (time.time() + ttl, json.dumps(value, default=str))

    def delete(self, key: str) -> None:
        self._data.pop(key, None)

    def flush(self) -> None:
        self._data.clear()


# ── Redis adapter ──────────────────────────────────────────────────────────────

class _RedisStore:
    def __init__(self, client: Any) -> None:
        self._r = client

    def get(self, key: str) -> Any | None:
        try:
            raw = self._r.get(key)
            return json.loads(raw) if raw else None
        except Exception as exc:
            logger.warning("Redis GET error: %s", exc)
            return None

    def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        try:
            self._r.setex(key, ttl, json.dumps(value, default=str))
        except Exception as exc:
            logger.warning("Redis SET error: %s", exc)

    def delete(self, key: str) -> None:
        try:
            self._r.delete(key)
        except Exception as exc:
            logger.warning("Redis DEL error: %s", exc)

    def flush(self) -> None:
        """Flush only our namespace — never FLUSHDB."""
        try:
            cursor = "0"
            while cursor:
                cursor, keys = self._r.scan(cursor=cursor, match=f"{_PREFIX}*", count=200)
                if keys:
                    self._r.delete(*keys)
        except Exception as exc:
            logger.warning("Redis flush error: %s", exc)


# ── Public cache singleton ─────────────────────────────────────────────────────

class Cache:
    """Thin façade — delegates to Redis or memory store."""

    def __init__(self) -> None:
        self._store = self._connect()

    @staticmethod
    def _connect() -> _RedisStore | _MemoryStore:
        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            try:
                import redis as redis_lib
                client = redis_lib.Redis.from_url(
                    redis_url, decode_responses=True, socket_connect_timeout=2,
                )
                client.ping()
                logger.info("Cache: Redis connected (%s)", redis_url)
                return _RedisStore(client)
            except Exception as exc:
                logger.warning("Cache: Redis unavailable (%s) — falling back to memory", exc)
        else:
            logger.info("Cache: REDIS_URL not set — using in-memory store")
        return _MemoryStore()

    # ── public API (auto-prefixed) ─────────────────────────────────────

    def get(self, key: str) -> Any | None:
        return self._store.get(f"{_PREFIX}{key}")

    def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        self._store.set(f"{_PREFIX}{key}", value, ttl)

    def delete(self, key: str) -> None:
        self._store.delete(f"{_PREFIX}{key}")

    def flush(self) -> None:
        self._store.flush()

    @property
    def backend(self) -> str:
        return "redis" if isinstance(self._store, _RedisStore) else "memory"


# Module-level singleton
cache = Cache()
