# Scrappling Skill

Use Scrappling when you need to scrape a public webpage and convert it into agent-friendly Markdown.

## Instructions

1. Read `/llms.txt` for discovery.
2. Read `/llms-full.txt` if you need schema details.
3. Call `POST /api/scrape` with JSON:

```json
{
  "url": "https://example.com"
}
```

4. Check `result.ok`.
5. If `result.ok === true`, use `result.markdown` as the primary scraped content.
6. If `result.ok === false`, report `result.code` and `result.message`.

## Limits

Only scrape public pages. Do not bypass login, paywalls, CAPTCHA, private pages, or access controls. Keep request volume polite.
