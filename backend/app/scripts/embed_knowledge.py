"""
embed_knowledge.py — One-time script to embed the curated knowledge base into PGVector using Gemini.

Loads from TWO sources:
  1. backend/knowledge_base/*.md  — markdown docs (DSA, web, systems)
  2. content/seed/*.json          — 265 JSON files covering 88 skills (sections, overviews, quizzes)

Run once after setting up Supabase PGVector extension:
    python -m app.scripts.embed_knowledge

Prerequisites:
    - SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY in .env
    - 'knowledge_chunks' table and 'match_knowledge' function created in Supabase
"""

from __future__ import annotations
import os
import sys
import json
import logging
import time
from pathlib import Path

# Add backend root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-8s %(message)s")
log = logging.getLogger("embed_knowledge")

KNOWLEDGE_BASE_DIR = Path(__file__).resolve().parent.parent.parent / "knowledge_base"
CONTENT_SEED_DIR = Path(__file__).resolve().parent.parent.parent.parent / "content" / "seed"

# Rate limiting: stay within Gemini free tier (15 RPM typical)
EMBED_DELAY_SECONDS = 4.5  # ~13 RPM, safely under 15


# ── Text Chunker ──────────────────────────────────────────────────────────────
def chunk_text(text: str, chunk_size: int = 700, overlap: int = 100) -> list[str]:
    """Simple overlap chunker."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return [c.strip() for c in chunks if c.strip()]


# ── Embedding ─────────────────────────────────────────────────────────────────
def embed_text(text: str) -> list[float] | None:
    try:
        from google import genai
        from app.core.settings import settings
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        embed_res = client.models.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents=text,
        )
        return embed_res.embeddings[0].values
    except Exception as e:
        log.error("Gemini embedding failed: %s", e)
        return None


# ── Supabase Insert ───────────────────────────────────────────────────────────
def insert_chunk(sb, topic: str, content: str, embedding: list[float], source_version: str = "v2.0"):
    """Insert a single chunk into knowledge_chunks."""
    sb.table("knowledge_chunks").insert({
        "topic": topic,
        "content": content,
        "embedding": embedding,
        "source_version": source_version,
    }).execute()


# ── Source 1: Markdown files from knowledge_base/ ─────────────────────────────
def load_markdown_files() -> list[dict]:
    """Load and chunk all .md files from knowledge_base/."""
    records = []
    if not KNOWLEDGE_BASE_DIR.exists():
        log.warning("Knowledge base dir not found: %s", KNOWLEDGE_BASE_DIR)
        return records

    for md_file in KNOWLEDGE_BASE_DIR.rglob("*.md"):
        text = md_file.read_text(encoding="utf-8").strip()
        if not text:
            continue
        topic = md_file.stem.replace("_", " ").replace("-", " ").title()
        chunks = chunk_text(text)
        for i, chunk in enumerate(chunks):
            records.append({
                "topic": f"{topic} (part {i+1})" if len(chunks) > 1 else topic,
                "content": chunk,
                "source": "knowledge_base",
            })
        log.info("  Loaded %s: %d chunks", md_file.name, len(chunks))

    return records


# ── Source 2: JSON files from content/seed/ ────────────────────────────────────
def load_content_seed_files() -> list[dict]:
    """Load and chunk all *_sections.json files from content/seed/."""
    records = []
    if not CONTENT_SEED_DIR.exists():
        log.warning("Content seed dir not found: %s", CONTENT_SEED_DIR)
        return records

    section_files = sorted(CONTENT_SEED_DIR.glob("*_sections.json"))
    log.info("Found %d section files in content/seed/", len(section_files))

    for json_file in section_files:
        skill_name = json_file.stem.replace("_sections.json", "").replace("_", " ").title()

        try:
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            log.warning("  Skipping %s: %s", json_file.name, e)
            continue

        # Handle both list and dict formats
        sections = []
        if isinstance(data, list):
            sections = data
        elif isinstance(data, dict):
            sections = data.get("sections", data.get("detailed_content", []))

        if not sections:
            continue

        for i, section in enumerate(sections):
            if not isinstance(section, dict):
                continue

            # Build a rich text chunk from all section fields
            parts = []
            subheading = section.get("subheading", f"Section {i+1}")
            parts.append(f"## {subheading}\n")

            explanation = section.get("explanation", "")
            if explanation:
                parts.append(explanation)

            example = section.get("example", "")
            if example:
                parts.append(f"\n\nExample:\n{example}")

            key_takeaway = section.get("key_takeaway", "")
            if key_takeaway:
                parts.append(f"\n\nKey Takeaway: {key_takeaway}")

            try_it = section.get("try_it", "")
            if try_it:
                parts.append(f"\n\nTry It: {try_it}")

            content = "\n".join(parts).strip()
            if not content or len(content) < 50:
                continue

            topic = f"{skill_name}: {subheading}"
            records.append({
                "topic": topic,
                "content": content,
                "source": "content_seed",
            })

        log.info("  Loaded %s: %d sections", json_file.name, len(sections))

    return records


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    from app.core.supabase_client import get_supabase
    sb = get_supabase()

    log.info("=" * 60)
    log.info("  Knowledge Base Embedding")
    log.info("=" * 60)

    # Check existing chunks
    try:
        existing = sb.table("knowledge_chunks").select("id", count="exact").limit(1).execute()
        log.info("Existing chunks in DB: %s", existing.count)
    except Exception:
        log.info("No existing chunks found (table may be empty)")

    # Load from both sources
    log.info("\nLoading markdown files from knowledge_base/...")
    md_records = load_markdown_files()
    log.info("  Total markdown chunks: %d", len(md_records))

    log.info("\nLoading content seed files from content/seed/...")
    seed_records = load_content_seed_files()
    log.info("  Total content seed chunks: %d", len(seed_records))

    all_records = md_records + seed_records
    log.info("\nTotal chunks to embed: %d", len(all_records))

    if not all_records:
        log.error("No records to embed. Check paths.")
        return

    # Embed and insert
    log.info("\nEmbedding and inserting (rate limit: ~13 RPM)...")
    success = 0
    failed = 0

    for i, record in enumerate(all_records):
        topic = record["topic"]
        content = record["content"]

        # Embed
        embedding = embed_text(content)
        if embedding is None:
            failed += 1
            log.warning("  [%d/%d] FAILED: %s", i+1, len(all_records), topic)
            continue

        # Insert
        try:
            insert_chunk(sb, topic, content, embedding, source_version="v2.0")
            success += 1
        except Exception as e:
            failed += 1
            log.error("  [%d/%d] INSERT FAILED: %s — %s", i+1, len(all_records), topic, e)
            continue

        if (i + 1) % 10 == 0 or i == len(all_records) - 1:
            log.info("  [%d/%d] Embedded: %s", i+1, len(all_records), topic)

        # Rate limit
        time.sleep(EMBED_DELAY_SECONDS)

    log.info("\n" + "=" * 60)
    log.info("  DONE")
    log.info("=" * 60)
    log.info("  Success: %d", success)
    log.info("  Failed:  %d", failed)
    log.info("  Total:   %d", len(all_records))


if __name__ == "__main__":
    main()
