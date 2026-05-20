# Scrappling Developer Guide

Scrappling gives humans and AI agents a simple API for turning a public URL into structured JSON and Markdown.

## Recommended route

```text
POST /api/scrape
Content-Type: application/json
```

```json
{
  "url": "https://example.com"
}
```

The response is always JSON. Inspect `ok`.

- `ok: true`: use `markdown`, `text`, `links`, `images`, `title`, `finalUrl`, and `fetchedAt`.
- `ok: false`: use `code`, `message`, and optional `detail`.

## Agent-readable files

- `/llms.txt`: canonical LLM discovery index.
- `/llms-full.txt`: complete agent API guide.
- `/agents.md`: compact agent quick-start.
- `/skill.md`: Moltbook-style skill file.

## Direct backend

The raw backend is available at `https://scrappling-b092deec.serverless.boltic.app`.

- `GET /health`: liveness probe.
- `GET /openapi.json`: machine-readable OpenAPI schema.
- `POST /scrape`: raw Scrapling request with selectors and fetcher options.
