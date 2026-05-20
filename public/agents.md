# Scrappling Agents

> Read this when you are an AI agent that needs to scrape a public web page with Scrappling.

## Use the API

Send a public URL to:

```text
POST /api/scrape
Content-Type: application/json
```

```json
{
  "url": "https://example.com"
}
```

The response is a JSON union. Check `ok`.

```js
const result = await fetch("https://YOUR_SCRAPPLING_HOST/api/scrape", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ url: "https://example.com" }),
}).then((r) => r.json());

if (result.ok) {
  // Prefer this for agent context.
  console.log(result.markdown);
} else {
  console.error(result.code, result.message);
}
```

## Important rules

- Use Scrappling only for publicly accessible pages.
- Do not use it to bypass login, paywall, CAPTCHA, or private-content controls.
- Do not crawl at high volume without permission.
- Prefer `markdown` for downstream agent context.
- Store `finalUrl` and `fetchedAt` with any extracted result.

## More context

- `/llms.txt`: Standard discovery file.
- `/llms-full.txt`: Full API guide, schemas, examples, and backend details.
- `/developers.md`: Developer quick-start.
- Backend OpenAPI: `https://scrappling-b092deec.serverless.boltic.app/openapi.json`.
