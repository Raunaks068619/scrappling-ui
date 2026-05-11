import * as cheerio from "cheerio";
import TurndownService from "turndown";
import type { ScrapeFetcher, ScrapeSuccess } from "./types";

const MAX_HTML = 1_000_000; // 1 MB cap before stash
const MAX_LINKS = 200;
const MAX_IMAGES = 50;

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "_",
  hr: "---",
});
// turndown's TS types only accept HTMLElementTagNameMap keys for the array form;
// pass a custom filter that drops the tags we don't want carried into Markdown.
turndown.remove((node) => {
  const tag = (node.nodeName || "").toLowerCase();
  return tag === "script" || tag === "style" || tag === "noscript" || tag === "iframe" || tag === "svg";
});

export type EnrichInput = {
  html: string;
  finalUrl: string;
  status: number;
  fetcher: ScrapeFetcher;
};

export function enrichFromHtml(input: EnrichInput): ScrapeSuccess {
  const html = input.html.length > MAX_HTML ? input.html.slice(0, MAX_HTML) : input.html;

  const $ = cheerio.load(html);

  // Strip non-content nodes from the parser tree before extracting text.
  $("script, style, noscript, iframe, svg, head").remove();

  const title = ($("title").first().text() || $("h1").first().text() || "").trim() || null;
  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    null;

  // Visible text: take body text, collapse whitespace.
  const text = ($("body").text() || $.text())
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Dedup links + cap.
  const seenLinks = new Set<string>();
  const links: ScrapeSuccess["links"] = [];
  $("a[href]").each((_, el) => {
    if (links.length >= MAX_LINKS) return;
    const href = ($(el).attr("href") || "").trim();
    if (!href || href.startsWith("javascript:") || href.startsWith("#")) return;
    let abs = href;
    try {
      abs = new URL(href, input.finalUrl).toString();
    } catch {
      // keep raw if URL constructor fails (e.g. mailto:)
    }
    if (seenLinks.has(abs)) return;
    seenLinks.add(abs);
    links.push({ href: abs, text: $(el).text().trim().slice(0, 200) });
  });

  // Dedup images + cap.
  const seenImgs = new Set<string>();
  const images: ScrapeSuccess["images"] = [];
  $("img[src]").each((_, el) => {
    if (images.length >= MAX_IMAGES) return;
    const src = ($(el).attr("src") || "").trim();
    if (!src) return;
    let abs = src;
    try {
      abs = new URL(src, input.finalUrl).toString();
    } catch {}
    if (seenImgs.has(abs)) return;
    seenImgs.add(abs);
    const alt = $(el).attr("alt");
    images.push({ src: abs, alt: alt ? alt.trim() : null });
  });

  const markdown = turndown.turndown(html);

  return {
    ok: true,
    finalUrl: input.finalUrl,
    status: input.status,
    title,
    description,
    text,
    markdown,
    html,
    links,
    images,
    fetchedAt: new Date().toISOString(),
    fetcher: input.fetcher,
  };
}
