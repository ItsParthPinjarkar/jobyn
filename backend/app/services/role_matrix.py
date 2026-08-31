"""
role_matrix.py — config-driven role definitions.

Loads roles from config/roles.json at startup.
Add new roles by editing roles.json — no code changes needed.
"""

from app.core.config_loader import load_roles

# ── Load once at startup ───────────────────────────────────────────────────────
_ROLE_MATRIX: dict = load_roles()

VALID_ROLES: list = list(_ROLE_MATRIX.keys())


def get_role(role_name: str) -> dict | None:
    """Return core/optional skill lists for a role, or None if not found."""
    return _ROLE_MATRIX.get(role_name)


def role_exists(role_name: str) -> bool:
    return role_name in _ROLE_MATRIX
