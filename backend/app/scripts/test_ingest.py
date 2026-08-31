"""
test_ingest.py — Verification script for the Scraping and Course Compilation engine.

Validates that scraper_service fetches and cleans HTML, ai_service generates a custom N-section
syllabus, and the compilation layer stores progressive notes successfully.
"""

import asyncio
import sys
from pathlib import Path

# Add backend root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

from app.services.scraper_service import scraper_service  # noqa: E402 — needs sys.path + dotenv above
from app.services.ai_service import ai_service  # noqa: E402 — needs sys.path + dotenv above

async def main():
    skill = "trie"
    url = "https://raw.githubusercontent.com/trekhleb/javascript-algorithms/master/src/data-structures/trie/README.md"

    print("=" * 60)
    print(f"1. TESTING SCRAPER SERVICE FOR SKILL: {skill.upper()}")
    print(f"Target Resource URL: {url}")
    print("=" * 60)

    try:
        scraped_text = await scraper_service.fetch_clean_markdown(url)
        print(f"[SUCCESS] Scraped {len(scraped_text)} characters of clean markdown/text.")
        print("-" * 60)
        print("SAMPLE OF CLEANED SCRAPED TEXT:")
        safe_scraped = scraped_text[:300].encode(sys.stdout.encoding or 'utf-8', errors='replace').decode(sys.stdout.encoding or 'utf-8')
        print(safe_scraped)
        print("...")
        print("-" * 60)
    except Exception as e:
        print(f"[ERROR] Scraping failed: {e}")
        return

    print("\n" + "=" * 60)
    print("2. TESTING DYNAMIC SYLLABUS COMPILER (N-SECTIONS)")
    print("=" * 60)

    try:
        sections = await ai_service.get_or_create_syllabus(skill)
        print(f"[SUCCESS] Dynamically generated {len(sections)} chapters/modules:")
        for sec in sections:
            safe_title = sec['title'].encode(sys.stdout.encoding or 'utf-8', errors='replace').decode(sys.stdout.encoding or 'utf-8')
            safe_desc = sec['desc'].encode(sys.stdout.encoding or 'utf-8', errors='replace').decode(sys.stdout.encoding or 'utf-8')
            print(f"  - Module {sec['idx']}: {safe_title} ({sec['duration']})")
            print(f"    Description: {safe_desc}")
        print("-" * 60)
    except Exception as e:
        print(f"[ERROR] Syllabus compilation failed: {e}")
        return

    print("\n" + "=" * 60)
    print("3. TESTING STUDY NOTES COMPILATION (PROGRESSIVE LOAD)")
    print("=" * 60)

    try:
        # Fetching section 0 (should generate and cache it)
        print("Compiling and caching Section 0 (Concept Foundation)...")
        section_data = await ai_service.get_study_section(skill, 0)
        print("[SUCCESS] Compiled Section 0:")
        safe_sub = section_data.get('subheading', '').encode(sys.stdout.encoding or 'utf-8', errors='replace').decode(sys.stdout.encoding or 'utf-8')
        safe_exp = section_data.get('explanation', '')[:200].encode(sys.stdout.encoding or 'utf-8', errors='replace').decode(sys.stdout.encoding or 'utf-8')
        safe_takeaway = section_data.get('key_takeaway', '').encode(sys.stdout.encoding or 'utf-8', errors='replace').decode(sys.stdout.encoding or 'utf-8')
        safe_try = section_data.get('try_it', '').encode(sys.stdout.encoding or 'utf-8', errors='replace').decode(sys.stdout.encoding or 'utf-8')

        print(f"  Subheading: {safe_sub}")
        print(f"  Explanation: {safe_exp}...")
        print(f"  Key Takeaway: {safe_takeaway}")
        print(f"  Try It: {safe_try}")
        print("-" * 60)
    except Exception as e:
        print(f"[ERROR] Section compilation failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
