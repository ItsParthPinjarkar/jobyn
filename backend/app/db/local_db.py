"""
local_db.py — DEPRECATED.

All storage has been migrated to Supabase.
This file is kept only for backward compatibility during transition.
Import paths that referenced local_db should now use:
  - app.services.knowledge_service (for knowledge_cache)
  - Supabase contributions table (for contributions)

See supabase_schema.sql for the replacement tables.
"""

import logging

log = logging.getLogger("db_service")
log.info("local_db.py is deprecated — all storage moved to Supabase.")
