# scrappling-ui

A single-page Next.js frontend for [Scrapling](https://github.com/D4Vinci/Scrapling).
Paste a URL → render with the stealth fetcher → JSON + Markdown side by side.

## Stack

- Next.js 15 App Router · React 19 · TypeScript strict
- CSS Modules (no Tailwind)
- Apple-product-launch design tokens — SF Pro Display, springy spring motion,
  pill CTA with circle→arrow
- `/api/scrape` runs in the Node runtime and either:
  - **proxies** to a Scrapling-on-Boltic deployment when `SCRAPER_BACKEND_URL`
    is set (the Vercel production path), or
  - **spawns** `scraper/scrape.py` locally otherwise (the dev path).

## Local dev

```bash
cp .env.example .env.local      # point at the Boltic backend
npm install
npm run dev
```

To run the Python sidecar instead of the proxy:

```bash
unset SCRAPER_BACKEND_URL
pip install "scrapling[fetchers]"
scrapling install
npm run dev
```

## Deploy

Push to a Vercel project, set `SCRAPER_BACKEND_URL` in env to the Boltic URL,
done. The Vercel function only proxies — no Python or browsers in the lambda.
