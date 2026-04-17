

## Newsletter Archive with PDF Search — Inline Snippets

Building on the previous plan, here's how match previews work so users see context before downloading.

### What the user sees

```text
Search: "young eagles rally"

┌─────────────────────────────────────────────────────────┐
│ April 2026 Newsletter                      [Open PDF]   │
│ Apr 1, 2026                                             │
│                                                         │
│ "...our annual <mark>Young Eagles Rally</mark> will be  │
│  held on May 18th at KPAO. Pilots interested in flying  │
│  should contact the <mark>Young Eagles</mark>           │
│  coordinator..."                                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ September 2025 Newsletter                  [Open PDF]   │
│ Sep 1, 2025                                             │
│                                                         │
│ "...thanks to all volunteers at the September           │
│  <mark>Young Eagles</mark> event — we flew 47 kids..."  │
└─────────────────────────────────────────────────────────┘
```

Matched terms are bolded/highlighted. Each result shows ~200 characters of context around the best match.

### How it works

Postgres has this built in — no extra work beyond the existing tsvector setup:

```sql
SELECT
  id,
  title,
  issue_date,
  storage_path,
  ts_headline(
    'english',
    extracted_text,
    websearch_to_tsquery('english', $1),
    'StartSel=<mark>, StopSel=</mark>, MaxWords=40, MinWords=15, MaxFragments=2'
  ) AS snippet,
  ts_rank(search_vector, websearch_to_tsquery('english', $1)) AS rank
FROM newsletters
WHERE search_vector @@ websearch_to_tsquery('english', $1)
ORDER BY rank DESC;
```

`ts_headline` automatically picks the best 1-2 fragments of text containing the search terms and wraps them in `<mark>` tags. The frontend renders the snippet HTML directly (safe — only `<mark>` tags from a server-controlled allowlist).

### Frontend rendering

In the result card:
```tsx
<p
  className="text-sm text-muted-foreground"
  dangerouslySetInnerHTML={{ __html: snippet }}
/>
```

Tailwind styles `<mark>` to use the chapter's accent color with a subtle background, matching the existing flat aesthetic.

### Tradeoffs

- **Cost**: free — `ts_headline` runs in the same query, no extra round trip
- **Quality**: very good for typical text; works on the extracted PDF text so accuracy depends on extraction quality (clean, modern PDFs work great; scanned-image PDFs would need OCR — flagged as out of scope)
- **No PDF page number**: the snippet shows matching text but doesn't link to the exact PDF page. If you want "jump to page 4 of the PDF" later, that's a follow-up using PDF.js viewer (noted as future enhancement)

### Updated plan summary

Everything from the previous plan stands, with this addition:
- Search results include `ts_headline` snippets with highlighted terms
- Result cards display the snippet inline, above the "Open PDF" button
- Users can scan multiple results and only download the PDF that actually has what they need

