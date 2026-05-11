import { spawn } from "node:child_process";
import { enrichFromHtml } from "./enrich";
import type { ScrapeFetcher, ScrapeResult } from "./types";

const HARD_TIMEOUT_MS = 30_000;

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
