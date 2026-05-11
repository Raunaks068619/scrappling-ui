import { spawn } from "node:child_process";
import { enrichFromHtml } from "./enrich";
import type { ScrapeFetcher, ScrapeResult, ScrapeSuccess } from "./types";

const HARD_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Heuristic: did the upstream return a WAF stub instead of the real page?
//
// Myntra/Flipkart/Akamai-fronted sites serve a 400-byte "Site Maintenance /
// Oops! Something went wrong" page when they detect a datacenter IP. Stealth
// browsers can't fix this because the block lands on IP reputation *before*
// the fingerprint check.
// ---------------------------------------------------------------------------

const BLOCK_PATTERNS = [
  /site maintenance/i,
  /access denied/i,
  /are you a human/i,
  /please verify you are/i,
  /attention required.*cloudflare/i,
  /just a moment\.\.\./i,
  /oops!?\s+something went wrong/i,
  /please contact your administrator/i,
  /pardon our interruption/i,
  /request blocked/i,
  /enable javascript and cookies to continue/i,
];

export function looksBlocked(result: ScrapeSuccess): boolean {
  const html = result.html ?? "";
  // Real pages are usually multi-KB; WAF stubs are 200-2000 bytes.
  const tooSmall = html.length < 2_000;
  const titleSuspicious =
    result.title !== null && /maintenance|oops|denied|forbidden|blocked|verify/i.test(result.title);
  const bodySuspicious = BLOCK_PATTERNS.some((re) => re.test(html));
  return (tooSmall && (titleSuspicious || bodySuspicious)) || bodySuspicious;
}

// ---------------------------------------------------------------------------
// Jina Reader fallback — r.jina.ai/<url> returns clean markdown.
// Free tier: 200 RPM, no auth. Set JINA_API_KEY for higher limits.
// ---------------------------------------------------------------------------

const LINK_RE = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export async function scrapeViaJina(url: string): Promise<ScrapeResult> {
  const endpoint = "https://r.jina.ai/" + url;
  const headers: Record<string, string> = { accept: "text/plain" };
  if (process.env.JINA_API_KEY) headers.authorization = `Bearer ${process.env.JINA_API_KEY}`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), HARD_TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch(endpoint, { headers, signal: controller.signal });
  } catch (err) {
    clearTimeout(t);
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      code: isAbort ? "TIMEOUT" : "FETCH_FAILED",
      message: isAbort
        ? "Jina Reader took longer than 30 seconds."
        : "Couldn't reach Jina Reader.",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
  clearTimeout(t);

  if (!resp.ok) {
    return {
      ok: false,
      code: "FETCH_FAILED",
      message: `Jina Reader returned ${resp.status}. The site may also be blocking residential proxies.`,
    };
  }

  const text = await resp.text();
  // Jina format: "Title: ...\nURL Source: ...\n\nMarkdown Content:\n<markdown>"
  const titleMatch = text.match(/^Title:\s*(.+)$/m);
  const urlMatch = text.match(/^URL Source:\s*(.+)$/m);
  const mdStart = text.indexOf("Markdown Content:");
  const markdown = mdStart >= 0 ? text.slice(mdStart + "Markdown Content:".length).replace(/^\s*\n/, "") : text;

  // Extract links + images from the markdown (deduped, capped).
  const seenLinks = new Set<string>();
  const links: ScrapeSuccess["links"] = [];
  for (const m of markdown.matchAll(LINK_RE)) {
    if (links.length >= 200) break;
    const href = (m[2] ?? "").trim();
    if (!href || href.startsWith("#") || seenLinks.has(href)) continue;
    seenLinks.add(href);
    links.push({ href, text: (m[1] ?? "").trim().slice(0, 200) });
  }
  const seenImgs = new Set<string>();
  const images: ScrapeSuccess["images"] = [];
  for (const m of markdown.matchAll(IMAGE_RE)) {
    if (images.length >= 50) break;
    const src = (m[2] ?? "").trim();
    if (!src || seenImgs.has(src)) continue;
    seenImgs.add(src);
    const alt = (m[1] ?? "").trim();
    images.push({ src, alt: alt || null });
  }

  // Plain text: strip the most common markdown syntax for the "text" field.
  const plain = markdown
    .replace(IMAGE_RE, "")
    .replace(LINK_RE, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/[*_`>]+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    ok: true,
    finalUrl: (urlMatch?.[1] ?? url).trim(),
    status: 200,
    title: titleMatch ? titleMatch[1]!.trim() : null,
    description: null,
    text: plain,
    markdown,
    html: "", // Jina doesn't return raw HTML
    links,
    images,
    fetchedAt: new Date().toISOString(),
    fetcher: "JinaReader",
  };
}

// ---------------------------------------------------------------------------
// Production path — proxy to the Boltic deployment that runs Scrapling.
// ---------------------------------------------------------------------------

export async function scrapeViaBoltic(url: string, backendBase: string, token?: string): Promise<ScrapeResult> {
  const endpoint = backendBase.replace(/\/+$/, "") + "/scrape";

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), HARD_TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        url,
        fetcher: "stealth",
        return_html: true,
        network_idle: false,
        headless: true,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(t);
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      code: isAbort ? "TIMEOUT" : "FETCH_FAILED",
      message: isAbort
        ? "The scrape took longer than 30 seconds. Try a lighter page or retry."
        : "Couldn't reach the scraping backend. Check your network and try again.",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
  clearTimeout(t);

  if (!resp.ok) {
    let detail = `Backend returned ${resp.status}`;
    try {
      const j = (await resp.json()) as { detail?: unknown; error?: unknown };
      if (j && (j.detail || j.error)) detail = JSON.stringify(j.detail ?? j.error);
    } catch {}
    return {
      ok: false,
      code: "FETCH_FAILED",
      message: "The page couldn't be loaded. The site may be blocking us or the URL might be wrong.",
      detail,
    };
  }

  let payload: unknown;
  try {
    payload = await resp.json();
  } catch (err) {
    return {
      ok: false,
      code: "PARSE_FAILED",
      message: "The scraper responded with something we couldn't read. Try again or report this.",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  // Boltic returns {url, status, fetcher, results, html?}
  const p = payload as {
    url?: string;
    status?: number;
    fetcher?: string;
    html?: string | null;
  };
  if (!p || typeof p !== "object" || typeof p.html !== "string") {
    return {
      ok: false,
      code: "PARSE_FAILED",
      message: "The scraper returned no HTML. Some sites block headless browsers entirely.",
      detail: JSON.stringify(p).slice(0, 400),
    };
  }

  const fetcher = mapFetcher(p.fetcher);
  return enrichFromHtml({
    html: p.html,
    finalUrl: p.url ?? url,
    status: p.status ?? 200,
    fetcher,
  });
}

function mapFetcher(name: string | undefined): ScrapeFetcher {
  if (name === "dynamic") return "PlayWrightFetcher";
  if (name === "http") return "Fetcher";
  return "StealthyFetcher";
}

// ---------------------------------------------------------------------------
// Dev path — spawn the local Python sidecar.
// ---------------------------------------------------------------------------

export async function scrapeViaSidecar(url: string, scriptPath: string): Promise<ScrapeResult> {
  return new Promise<ScrapeResult>((resolve) => {
    const child = spawn("python3", [scriptPath, url], {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let out = "";
    let err = "";
    let settled = false;
    const t = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      resolve({
        ok: false,
        code: "TIMEOUT",
        message: "The scrape took longer than 30 seconds. Try a lighter page or retry.",
      });
    }, HARD_TIMEOUT_MS);

    child.stdout.on("data", (b: Buffer) => (out += b.toString("utf8")));
    child.stderr.on("data", (b: Buffer) => (err += b.toString("utf8")));

    child.on("error", (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      resolve({
        ok: false,
        code: "PYTHON_MISSING",
        message: "Python 3 isn't available on this host. Install it or set SCRAPER_BACKEND_URL.",
        detail: e.message,
      });
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      if (code !== 0) {
        if (/ModuleNotFoundError.*scrapling/i.test(err)) {
          resolve({
            ok: false,
            code: "SCRAPLING_MISSING",
            message:
              "Scrapling isn't installed in this Python. Run `pip install 'scrapling[fetchers]' && scrapling install`.",
            detail: err.slice(0, 800),
          });
          return;
        }
        // Try to parse a ScrapeError JSON from stderr first.
        try {
          const j = JSON.parse(err) as ScrapeResult;
          if (j && j.ok === false) {
            resolve(j);
            return;
          }
        } catch {}
        resolve({
          ok: false,
          code: "FETCH_FAILED",
          message: "The page couldn't be loaded. The site may be blocking us or the URL might be wrong.",
          detail: err.slice(0, 800),
        });
        return;
      }
      try {
        const parsed = JSON.parse(out) as ScrapeResult;
        resolve(parsed);
      } catch (e) {
        resolve({
          ok: false,
          code: "PARSE_FAILED",
          message: "The Python sidecar produced output we couldn't parse. Check the server log.",
          detail: (e instanceof Error ? e.message : String(e)) + "\n" + out.slice(0, 400),
        });
      }
    });
  });
}
