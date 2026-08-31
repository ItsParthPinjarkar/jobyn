"""
utils.py — shared utilities for the inference API.

Keeps main.py and inference.py clean.
"""

from __future__ import annotations
import logging
import time

log = logging.getLogger("utils")


class Timer:
    """
    Context-manager and callable stopwatch (milliseconds).

    Usage (callable):
        elapsed = Timer()
        ...do work...
        ms = elapsed()   # float

    Usage (context manager):
        with Timer() as t:
            ...do work...
        print(t.ms)
    """

    def __init__(self) -> None:
        self._start = time.perf_counter()

    def __call__(self) -> float:
        """Return elapsed milliseconds."""
        return round((time.perf_counter() - self._start) * 1000, 2)

    def __enter__(self) -> "Timer":
        return self

    def __exit__(self, *_) -> None:
        self.ms = self()


def clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    """Clamp a float to [lo, hi]."""
    return max(lo, min(hi, value))


def normalise_skill_list(skills: list[str]) -> list[str]:
    """Lowercase, strip, deduplicate while preserving order."""
    seen: set[str] = set()
    result: list[str] = []
    for s in skills:
        clean = s.lower().strip()
        if clean and clean not in seen:
            seen.add(clean)
            result.append(clean)
    return result
