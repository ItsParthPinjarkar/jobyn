"""
seed_content.py — Bulk-load static JSON content into Supabase knowledge_cache.

Seeds 88 skills with:
  - Study overviews → knowledge_cache (type="study")
  - Individual sections → knowledge_cache (type="section")
  - Syllabus structures → dynamic_curriculums table

Skips quiz files — Gemini-generated runtime quizzes are higher quality.

Run:
    python -m app.scripts.seed_content [--dry-run] [--skill python]
"""

from __future__ import annotations
import os
import sys
import json
import logging
from pathlib import Path

# Add backend root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-8s %(message)s")
log = logging.getLogger("seed_content")

# Seed content directory (where the static JSON files live)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "content" / "seed"

# Cache version must match knowledge_service.py
CACHE_VERSION = 4


def load_supabase():
    from supabase import create_client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        log.error("Missing SUPABASE_URL or SUPABASE_KEY in environment")
        sys.exit(1)
    return create_client(url, key)


def seed_overview(sb, skill: str, dry_run: bool = False) -> bool:
    """Seed a single skill's overview into knowledge_cache (type='study')."""
    overview_path = PROJECT_ROOT / f"{skill}_overview.json"
    sections_path = PROJECT_ROOT / f"{skill}_sections.json"

    if not overview_path.exists():
        log.warning("  Overview file missing: %s", overview_path.name)
        return False

    overview = json.loads(overview_path.read_text(encoding="utf-8"))

    # Count total sections from the sections file for metadata
    total_sections = 0
    if sections_path.exists():
        sections_data = json.loads(sections_path.read_text(encoding="utf-8"))
        total_sections = len([s for s in sections_data if s.get("subheading") != "Practice Problems"])

    # Build the sub_roadmap from overview's detailed_content
    sub_roadmap = []
    for dc in overview.get("detailed_content", []):
        sub_roadmap.append({
            "title": dc.get("subheading", ""),
            "duration": overview.get("estimated_study_time", "15 minutes")
        })

    # Enrich with metadata that ai_service.py expects
    content = {
        "skill": skill,
        "quick_summary": overview.get("quick_summary", ""),
        "estimated_study_time": overview.get("estimated_study_time", "45 minutes"),
        "detailed_content": overview.get("detailed_content", []),
        "pro_tip": overview.get("pro_tip", ""),
        "sub_roadmap": sub_roadmap if sub_roadmap else [{"title": f"Module {i+1}", "duration": "15 min"} for i in range(total_sections)],
        "total_sections": total_sections,
        "sources": [{"title": skill, "source_type": "Pre-seeded content", "version": f"v{CACHE_VERSION}"}],
        "_cache_version": CACHE_VERSION,
    }

    if dry_run:
        log.info("  [DRY RUN] Would seed overview for %s (%d sections, %d chars)", skill, total_sections, len(json.dumps(content)))
        return True

    try:
        sb.table("knowledge_cache").upsert(
            {
                "topic": skill.lower(),
                "type": "study",
                "content": content,
                "updated_at": "now()",
            },
            on_conflict="topic,type",
        ).execute()
        log.info("  Seeded overview for %s (%d sections)", skill, total_sections)
        return True
    except Exception as e:
        log.error("  Failed to seed overview for %s: %s", skill, e)
        return False


def seed_sections(sb, skill: str, dry_run: bool = False) -> int:
    """Seed individual sections into knowledge_cache (type='section')."""
    sections_path = PROJECT_ROOT / f"{skill}_sections.json"

    if not sections_path.exists():
        log.warning("  Sections file missing: %s", sections_path.name)
        return 0

    sections_data = json.loads(sections_path.read_text(encoding="utf-8"))
    seeded = 0

    for i, section in enumerate(sections_data):
        title = section.get("subheading", "")
        if title == "Practice Problems":
            continue

        cache_key = f"{skill.lower()}_section_{i}"
        content = {
            "subheading": title,
            "explanation": section.get("explanation", ""),
            "example": section.get("example", ""),
            "key_takeaway": section.get("key_takeaway", ""),
            "try_it": section.get("try_it", ""),
            "complexity": section.get("complexity", ""),
            "_cache_version": CACHE_VERSION,
        }

        # Include practice_challenges if this is the last non-practice section
        if i == len(sections_data) - 2 and "practice_challenges" in section:
            content["practice_challenges"] = section["practice_challenges"]

        if dry_run:
            log.info("  [DRY RUN] Would seed section %d: %s", i, title[:50])
            seeded += 1
            continue

        try:
            sb.table("knowledge_cache").upsert(
                {
                    "topic": cache_key,
                    "type": "section",
                    "content": content,
                    "updated_at": "now()",
                },
                on_conflict="topic,type",
            ).execute()
            seeded += 1
        except Exception as e:
            log.error("  Failed to seed section %d for %s: %s", i, skill, e)

    return seeded


def seed_syllabus(sb, skill: str, dry_run: bool = False) -> bool:
    """Seed the syllabus structure into dynamic_curriculums table."""
    sections_path = PROJECT_ROOT / f"{skill}_sections.json"

    if not sections_path.exists():
        return False

    sections_data = json.loads(sections_path.read_text(encoding="utf-8"))
    syllabus = []

    for i, section in enumerate(sections_data):
        title = section.get("subheading", "")
        if title == "Practice Problems":
            continue
        syllabus.append({
            "idx": i,
            "title": title,
            "desc": (section.get("explanation", "") or "")[:150],
            "duration": "15 minutes",
        })

    if dry_run:
        log.info("  [DRY RUN] Would seed syllabus for %s (%d modules)", skill, len(syllabus))
        return True

    try:
        sb.table("dynamic_curriculums").upsert(
            {"skill": skill.lower(), "sections": syllabus},
            on_conflict="skill",
        ).execute()
        log.info("  Seeded syllabus for %s (%d modules)", skill, len(syllabus))
        return True
    except Exception as e:
        log.error("  Failed to seed syllabus for %s: %s", skill, e)
        return False


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Seed Supabase with static content")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--skill", type=str, help="Seed only this skill (e.g. python)")
    args = parser.parse_args()

    # Discover all skills
    if args.skill:
        skills = [args.skill]
    else:
        section_files = sorted(PROJECT_ROOT.glob("*_sections.json"))
        skills = [f.stem.replace("_sections", "") for f in section_files if f.name != "all_study_sections.json"]

    log.info("=" * 60)
    log.info("Seeding %d skills%s", len(skills), " (DRY RUN)" if args.dry_run else "")
    log.info("=" * 60)

    sb = load_supabase()

    stats = {
        "overviews_seeded": 0,
        "sections_seeded": 0,
        "syllabi_seeded": 0,
        "failed": [],
    }

    for skill in skills:
        log.info("Processing: %s", skill)

        # 1. Seed overview
        if seed_overview(sb, skill, args.dry_run):
            stats["overviews_seeded"] += 1

        # 2. Seed individual sections
        n = seed_sections(sb, skill, args.dry_run)
        stats["sections_seeded"] += n

        # 3. Seed syllabus
        if seed_syllabus(sb, skill, args.dry_run):
            stats["syllabi_seeded"] += 1

    log.info("=" * 60)
    log.info("SEED COMPLETE")
    log.info("  Overviews: %d/%d", stats["overviews_seeded"], len(skills))
    log.info("  Sections:  %d", stats["sections_seeded"])
    log.info("  Syllabi:   %d/%d", stats["syllabi_seeded"], len(skills))
    if stats["failed"]:
        log.info("  Failed:    %d — %s", len(stats["failed"]), stats["failed"])
    log.info("=" * 60)


if __name__ == "__main__":
    main()
