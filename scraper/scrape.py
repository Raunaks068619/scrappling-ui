#!/usr/bin/env python3
"""Local Scrapling sidecar.

Usage: python3 scraper/scrape.py <url>

Emits a JSON ScrapeResult to stdout on success (`ok: true`), or a JSON
ScrapeError to stderr and exits 1 on failure. Matches the TS discriminated
union in src/lib/types.ts.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import sys
import traceback
import urllib.parse
from typing import Any


# -- Output helpers ----------------------------------------------------------


def emit_success(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False))
    sys.stdout.flush()
    sys.exit(0)


def emit_error(code: str, message: str, detail: str | None = None) -> None:
    err = {"ok": False, "code": code, "message": message}
    if detail:
        err["detail"] = detail[:4000]
    sys.stderr.write(json.dumps(err, ensure_ascii=False))
    sys.stderr.flush()
    sys.exit(1)


# -- Cleaners ----------------------------------------------------------------


_RE_WS = re.compile(r"[ \t]+")
_RE_NL = re.compile(r"\n{3,}")


def clean_text(s: str) -> str:
    s = _RE_WS.sub(" ", s)
    s = _RE_NL.sub("\n\n", s)
    return s.strip()


def abs_url(base: str, href: str) -> str:
    try:
        return urllib.parse.urljoin(base, href)
    except Exception:
        return href


# -- Main --------------------------------------------------------------------


def main() -> None:
    if len(sys.argv) < 2:
        emit_error("INVALID_URL", "No URL passed to the sidecar.")
        return

    url = sys.argv[1]
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        emit_error("INVALID_URL", "URL must start with http:// or https://.")
        return

    try:
        from scrapling.fetchers import StealthyFetcher  # type: ignore
    except ImportError as exc:
        emit_error(
            "SCRAPLING_MISSING",
            "Scrapling isn't installed in this Python. "
            "Run `pip install 'scrapling[fetchers]' && scrapling install`.",
            detail=str(exc),
        )
        return

    try:
        page = StealthyFetcher.fetch(url, headless=True, network_idle=False)
    except Exception as exc:  # noqa: BLE001
        emit_error(
            "FETCH_FAILED",
            "The page couldn't be loaded. The site may be blocking us or the URL might be wrong.",
            detail=f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}",
        )
        return

    try:
        final_url = getattr(page, "url", None) or url
        status = int(getattr(page, "status", 200) or 200)
        html = getattr(page, "html_content", None) or getattr(page, "body", "")
        if isinstance(html, bytes):
            html = html.decode("utf-8", errors="replace")
        html = html or ""
        if len(html) > 1_000_000:
            html = html[:1_000_000]

        title = None
        try:
            t = page.css_first("title")
            if t is not None:
                title = (t.text or "").strip() or None
        except Exception:
            pass

        description = None
        for sel in ('meta[name="description"]', 'meta[property="og:description"]'):
            try:
                m = page.css_first(sel)
                if m is not None:
                    description = (m.attrib.get("content") or "").strip() or None
                    if description:
                        break
            except Exception:
                continue

        try:
            visible = page.css_first("body")
            text = clean_text((visible.get_all_text(strip=True) if visible else "") or "")
        except Exception:
            text = ""

        # Links (deduped, first 200)
        seen_links: set[str] = set()
        links: list[dict[str, str]] = []
        try:
            for a in page.css("a[href]"):
                if len(links) >= 200:
                    break
                href = (a.attrib.get("href") or "").strip()
                if not href or href.startswith(("javascript:", "#")):
                    continue
                href_abs = abs_url(final_url, href)
                if href_abs in seen_links:
                    continue
                seen_links.add(href_abs)
                links.append({"href": href_abs, "text": (a.text or "").strip()[:200]})
        except Exception:
            pass

        # Images (deduped, first 50)
        seen_imgs: set[str] = set()
        images: list[dict[str, str | None]] = []
        try:
            for img in page.css("img[src]"):
                if len(images) >= 50:
                    break
                src = (img.attrib.get("src") or "").strip()
                if not src:
                    continue
                src_abs = abs_url(final_url, src)
                if src_abs in seen_imgs:
                    continue
                seen_imgs.add(src_abs)
                alt = img.attrib.get("alt")
                images.append({"src": src_abs, "alt": (alt.strip() if alt else None)})
        except Exception:
            pass

        emit_success(
            {
                "ok": True,
                "finalUrl": final_url,
                "status": status,
                "title": title,
                "description": description,
                "text": text,
                # Markdown is generated by the TS route handler (turndown).
                # The sidecar returns a placeholder; the route enriches when used.
                "markdown": "",
                "html": html,
                "links": links,
                "images": images,
                "fetchedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
                "fetcher": "StealthyFetcher",
            }
        )
    except Exception as exc:  # noqa: BLE001
        emit_error(
            "PARSE_FAILED",
            "Couldn't parse the rendered page. Try a different URL.",
            detail=f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}",
        )


if __name__ == "__main__":
    main()
