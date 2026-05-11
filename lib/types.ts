// Single source of truth for the scraper wire format.
// The shape is a discriminated union — `ok: true | false` is the tag.

export type ScrapeRequest = { url: string };

export type ScrapeFetcher =
  | "StealthyFetcher"
  | "PlayWrightFetcher"
  | "Fetcher";

export type ScrapeSuccess = {
  ok: true;
  finalUrl: string;
  status: number;
  title: string | null;
  description: string | null;
  text: string; //  cleaned visible text
  markdown: string; //  HTML → Markdown via turndown
  html: string; //  truncated to ~1 MB
  links: { href: string; text: string }[];
  images: { src: string; alt: string | null }[];
  fetchedAt: string; //  ISO
  fetcher: ScrapeFetcher;
};

export type ScrapeErrorCode =
  | "INVALID_URL"
  | "PYTHON_MISSING"
  | "SCRAPLING_MISSING"
  | "TIMEOUT"
  | "FETCH_FAILED"
  | "PARSE_FAILED"
  | "UNKNOWN";

export type ScrapeError = {
  ok: false;
  code: ScrapeErrorCode;
  message: string; //  plain-language: what happened → why → what to do
  detail?: string; //  dev-console only
};

export type ScrapeResult = ScrapeSuccess | ScrapeError;
