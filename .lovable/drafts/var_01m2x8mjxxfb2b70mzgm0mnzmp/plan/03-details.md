# Technical details

## Data

- New table `survey_responses`: `id`, `submitted_at`, `answers` (JSONB keyed by question id, e.g. `q7` holds the grid as `{row: column}`), optional `follow_up` text for Q28, plus a `survey_key` (`new-member-2025`) so future surveys can reuse the table.
- Security: anyone (even signed-out visitors) can insert a response; only admins/officers can read. No update or delete for anyone except admins.
- The question list itself lives in the app code (one definition file mirroring the spec verbatim: wording, options, types, ★ required flags, max-picks). Changing a question later is a code edit — acceptable since this is a one-shot survey.
- The database change applies when you accept this draft; the survey pages will work in preview only after that.

## Pages

- `src/pages/Survey.tsx` — public route `/survey`, added to the router outside the signed-in shell (like the Join page). Mobile-first, one section per card, 44px tap targets, chapter logo header, intro text from the spec.
- `src/pages/SurveyResults.tsx` — officer-only route (same gating as other officer services), added to Officer Services menu with a live response count.
- Aggregation computed client-side from fetched responses (dataset is small — dozens of rows).

## Not included (say the word to add)

- No automatic email blast — you send the link yourself.
- No edits to the survey after launch while responses are open (would mix answer sets).
- No per-person completion tracking (incompatible with full anonymity).
