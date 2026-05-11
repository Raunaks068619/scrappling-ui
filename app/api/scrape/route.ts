import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { scrapeViaBoltic, scrapeViaSidecar } from "@/lib/scrape-client";
import type { ScrapeResult } from "@/lib/types";
import { normalizeUrl } from "@/lib/validate-url";

// We need the Node runtime — child_process for the local sidecar fallback,
// and cheerio/turndown don't run in Edge anyway.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<NextResponse<ScrapeResult>> {
  let body: { url?: unknown };
  try {
    body = (await req.json()) as { url?: unknown };
  } catch {
    return NextResponse.json<ScrapeResult>(
      {
        ok: false,
        code: "PARSE_FAILED",
        message: "The request body wasn't valid JSON.",
      },
      { status: 400 },
    );
  }

  const raw = typeof body.url === "string" ? body.url : "";
  const url = normalizeUrl(raw);
  if (!url) {
    return NextResponse.json<ScrapeResult>(
      {
        ok: false,
        code: "INVALID_URL",
        message: "Paste a full URL starting with http:// or https://.",
      },
      { status: 422 },
    );
  }

  // Production fallback — the Boltic Scrapling deployment from the sibling repo.
  // Set SCRAPER_BACKEND_URL in env to override (e.g. for staging or self-host).
  const BOLTIC_DEFAULT = "https://scrappling-b092deec.serverless.boltic.app";
  const backend = process.env.SCRAPER_BACKEND_URL || BOLTIC_DEFAULT;
  const token = process.env.SCRAPER_BACKEND_TOKEN;

  // Use the sidecar only when explicitly opted into via PREFER_SIDECAR=1 (local dev).
  const preferSidecar = process.env.PREFER_SIDECAR === "1";
  const result: ScrapeResult = preferSidecar
    ? await scrapeViaSidecar(url, path.join(process.cwd(), "scraper", "scrape.py"))
    : await scrapeViaBoltic(url, backend, token);

  // Always return 200 with the discriminated union so the client owns rendering.
  return NextResponse.json<ScrapeResult>(result, { status: 200 });
}
