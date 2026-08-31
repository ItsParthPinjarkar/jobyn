"""
scraper_service.py — Ingests and sanitizes technical content from authority resource links.

Uses httpx for high-performance async requests and BeautifulSoup for clean, junk-free HTML parsing.
"""

import logging
import httpx
from bs4 import BeautifulSoup
from app.core.cache import cache

log = logging.getLogger("scraper_service")

class ScraperService:
    def __init__(self, timeout: float = 12.0):
        self.timeout = timeout
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
                " (Jobyn Scraper; +https://getjobyn.pages.dev)"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }

    async def fetch_clean_markdown(self, url: str) -> str:
        """
        Fetches the target URL, strips out advertisements, headers, navigation blocks,
        and sidebars, then compiles the remaining text into a structured, clean format.
        """
        cache_key = f"scraped:{url}"

        # 1. Try L1 Cache first
        try:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                log.info("L1 Cache HIT for scraped URL: %s", url)
                return cached_data
        except Exception as e:
            log.warning("Scraper L1 cache read error: %s", e)

        # 2. Scrape over the network
        try:
            log.info("Scraping authority resource link: %s", url)
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                resp = await client.get(url, headers=self.headers)
                if resp.status_code != 200:
                    raise Exception(f"HTTP error status {resp.status_code}")

                soup = BeautifulSoup(resp.text, "html.parser")

                # 1. Clean out standard non-article junk elements
                for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe", "form"]):
                    tag.decompose()

                # Remove sidebars and headers based on standard classnames
                for class_prefix in ["sidebar", "navigation", "footer", "header", "menu", "banner", "ad-", "social-"]:
                    for element in soup.find_all(class_=lambda c: c and any(prefix in c.lower() for prefix in class_prefix.split(","))):
                        element.decompose()

                # 2. Extract core content area (main, article, div id=content or body)
                content_container = (
                    soup.find("main") or
                    soup.find("article") or
                    soup.find(id="content") or
                    soup.find(class_=lambda c: c and "article" in c.lower()) or
                    soup.body or
                    soup
                )

                # 3. Format structural items to simple markdown-style headers
                for h in content_container.find_all(["h1", "h2", "h3", "h4", "h5", "h6"]):
                    level = int(h.name[1])
                    h.string = f"\n\n{'#' * level} {h.get_text().strip()}\n"

                for li in content_container.find_all("li"):
                    li.string = f"\n* {li.get_text().strip()}"

                # 4. Extract cleaned text paragraphs
                raw_text = content_container.get_text()

                # Clean multiple empty lines and excessive whitespace
                lines = []
                for line in raw_text.splitlines():
                    cleaned = line.strip()
                    if cleaned:
                        lines.append(cleaned)
                    elif lines and lines[-1] != "":
                        lines.append("") # keep a single empty separator line

                markdown_text = "\n".join(lines).strip()

                if len(markdown_text) < 150:
                    log.warning("Scraped content from %s is extremely short (%d chars). Fallback to full body.", url, len(markdown_text))

                # Cache successful scrape in Redis/Memory for 24 hours
                try:
                    cache.set(cache_key, markdown_text, ttl=86400)
                    log.info("Cached crawled content for %s to L1 Cache", url)
                except Exception as ce:
                    log.warning("Failed to cache scraped text for %s: %s", url, ce)

                return markdown_text

        except Exception as e:
            log.error("ScraperService failed to parse [%s]: %s", url, e)
            raise Exception(f"Resource scraping failed: {e}")

scraper_service = ScraperService()
