# Technical details

## Data

- New table `survey_responses`: `id`, `submitted_at`, `answers` (JSONB keyed by question id, e.g. `q7` holds the grid as `{row: column}`), plus a `survey_key` (`new-member-2026`) so future surveys can reuse the table. Q28 name/email is stored as part of the answers.
- Security: anyone (even signed-out visitors) can insert a response; only admins/officers can read. No update or delete for anyone except admins.
- The question list lives in the app code (one definition file mirroring the spec verbatim: wording, options, types, ★ required flags, max-picks), with the year updated to 2026. Changing a question later is a code edit — acceptable since this is a one-shot survey.
- The database change applies when you accept this draft; the survey pages will work in preview only after that.

## Pages

- `src/pages/Survey.tsx` — public route `/survey-new-members-2026`, added to the router outside the signed-in shell (like the Join page). Mobile-first, one section per card, 44px tap targets, chapter logo header, intro text from the spec.
- `src/pages/SurveyResults.tsx` — officer-only route (same gating as other officer services), added to Officer Services menu with a live response count.
- Aggregation computed client-side from fetched responses (dataset is small — dozens of rows).

## Not included (say the word to add)

- No automatic email blast — you send the link yourself.
- No edits to the survey after launch while responses are open (would mix answer sets).
- No per-person completion tracking (incompatible with full anonymity).
