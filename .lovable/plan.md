

The user wants the publication date shown in the archive to come from the **PDF content itself** (parsed during text extraction), not from the filename. Currently `issue_date` is auto-guessed from the filename at upload time. We should refine it from the actual PDF text during extraction.

### Approach

Update the `newsletter-extract-text` edge function to detect the publication month/year from the extracted text, and write it back to `newsletters.issue_date`. The archive list already displays `issue_date` — no UI changes needed beyond confirming the displayed value updates after extraction completes.

### Detection logic (in edge function, after text extraction)

Search the first ~3000 characters of extracted text (covers cover page / masthead) for the first match of:

1. `Month Year` — e.g. "April 2026", "Apr. 2026", "APRIL 2026"
2. `Month, Year` — e.g. "April, 2026"
3. `Month Day, Year` — e.g. "April 1, 2026" (use day if present, else day = 1)
4. Numeric `MM/YYYY` or `YYYY-MM` as fallback

Only accept years 2000–2099 to avoid false positives (phone numbers, page refs, etc.).

If a date is found and differs from the current `issue_date`, update it. If nothing is found, leave the filename-guessed date alone.

### Code change (single file)

In `supabase/functions/newsletter-extract-text/index.ts`, after extraction succeeds:

```ts
function detectIssueDate(text: string): string | null {
  const head = text.slice(0, 3000);
  const months = ["january","february","march","april","may","june",
                  "july","august","september","october","november","december"];
  const monthRe = "(jan(?:uary|\\.)?|feb(?:ruary|\\.)?|mar(?:ch|\\.)?|apr(?:il|\\.)?|may|jun(?:e|\\.)?|jul(?:y|\\.)?|aug(?:ust|\\.)?|sep(?:tember|t|\\.)?|oct(?:ober|\\.)?|nov(?:ember|\\.)?|dec(?:ember|\\.)?)";
  // "Month [Day,] Year"
  const re = new RegExp(`\\b${monthRe}\\s+(?:(\\d{1,2})\\s*,\\s*)?(20\\d{2})\\b`, "i");
  const m = head.match(re);
  if (m) {
    const monthIdx = months.findIndex(mo => mo.startsWith(m[1].toLowerCase().replace(".","").slice(0,3)));
    if (monthIdx >= 0) {
      const day = m[2] ? Math.min(parseInt(m[2],10), 28) : 1;
      return `${m[3]}-${String(monthIdx+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    }
  }
  // Fallback YYYY-MM or MM/YYYY
  const ym = head.match(/\b(20\d{2})[\-/](0?[1-9]|1[0-2])\b/) ||
             head.match(/\b(0?[1-9]|1[0-2])[\-/](20\d{2})\b/);
  if (ym) {
    const [year, month] = ym[1].length === 4 ? [ym[1], ym[2]] : [ym[2], ym[1]];
    return `${year}-${month.padStart(2,"0")}-01`;
  }
  return null;
}
```

Include the detected date in the update:

```ts
const detected = detectIssueDate(extracted);
const updates: Record<string, unknown> = {
  extracted_text: extracted,
  extraction_status: "done",
  extraction_error: null,
};
if (detected) updates.issue_date = detected;
await admin.from("newsletters").update(updates).eq("id", newsletterId);
```

### What the user sees

After uploading a PDF named e.g. `newsletter-final.pdf` (which would otherwise default to today's date), once indexing finishes the archive row will refresh to show the actual publication month, e.g. "Apr 1, 2026", read from the cover/masthead.

### Files

- `supabase/functions/newsletter-extract-text/index.ts` — add `detectIssueDate`, include `issue_date` in the post-extraction update
- No frontend changes — `NewslettersAdmin.tsx` already renders `issue_date` and invalidates the query when extraction completes

### Out of scope

- Re-running detection on already-uploaded newsletters (the existing "Re-index" button will pick up the new logic automatically — no migration needed)
- Detecting dates from scanned image-only PDFs (would require OCR, previously flagged out of scope)

