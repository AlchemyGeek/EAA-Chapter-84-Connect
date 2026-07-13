## Overview

Add applicant-facing email tooling to the New Member Applications page:

1. Show days since application on each card.
2. Two action buttons per applicant: **Payment Reminder** and **Application Completed** (welcome).
3. Use the two uploaded HTML templates, personalizing `{{first_name}}` and (for the reminder) `{{dues_amount}}`, plus swapping the CTA link on the payment reminder to the applicant's pro-rated Stripe/PayPal URL.
4. Applicant is the `to`; `membership@eaa84.org` is a real `cc` on the same message.

## UI changes — `src/pages/NewMemberApplications.tsx`

- On every applicant row/card, display **"Applied N days ago"** (using `differenceInCalendarDays` on `created_at`, already imported).
- Replace the current single "Send Reminder" action with two buttons:
  - **Payment Reminder** — enabled only when `fees_verified = false` and `reminder_sent_at IS NULL`. When already sent, show muted text "Reminder sent · <date>" instead of the button (matches current lock).
  - **Application Completed** — enabled only when `fees_verified = true` and `welcome_sent_at IS NULL`. When already sent, show muted text "Welcome sent · <date>".
- Each button opens a small confirm dialog showing the resolved recipient, CC, resolved dues amount / payment URL (for reminder), and a "Send" action.
- After a successful send, invalidate the applications query so the new "sent" state renders.

## Data model — one migration

Add to `new_member_applications`:
- `welcome_sent_at timestamptz` (nullable).

`reminder_sent_at` already exists and stays as the once-only lock for the payment reminder.

## Backend — edge functions

### Rework `supabase/functions/new-member-reminder/index.ts`

Replace its inline HTML with the uploaded **complete-your-membership** template. Keep the existing officer/admin auth check, the pro-rated payment URL resolution by quarter, the `reminder_sent_at` lock, and the enqueue-via-`enqueue_email` pattern. Changes:

- Load the uploaded template string (embedded as a `const HTML_TEMPLATE = \`...\`` in the function).
- Resolve the applicant's pro-rated fee row via `chapter_fees` (same quarter-token match already used to find the payment URL) and read its amount.
- Personalization:
  - `{{first_name}}` → applicant's `first_name` (HTML-escaped)
  - `{{dues_amount}}` → the pro-rated fee amount formatted as `$NN` (e.g. `$30`). If no pro-rated fee is configured for the quarter, fall back to `your dues`.
  - Rewrite the CTA `href` from `https://eaa84connect.lovable.app/join` to the resolved `payment_url`. If no payment URL is available, leave the CTA pointing at `/join`.
- Enqueue with a real `cc: ["membership@eaa84.org"]` on the payload (the queue dispatcher already forwards `cc`). Drop the separate "[Copy] …" second enqueue.

### New edge function `supabase/functions/new-member-welcome/index.ts`

Mirror the reminder function's shape:

- Officer/admin auth check (identical block).
- Load the application; require `fees_verified = true` and reject if `welcome_sent_at IS NOT NULL`.
- Embed the uploaded **welcome-new-member** template and personalize `{{first_name}}`.
- Enqueue via `enqueue_email` with `to: <applicant email>`, `cc: ["membership@eaa84.org"]`, `from: "Membership <notify@notify.eaa84.org>"`, `reply_to: "membership@eaa84.org"`, `label: "new_member_welcome"`, `idempotency_key: welcome-<application_id>`, plus unsubscribe token/message id like the reminder function.
- After enqueue, set `welcome_sent_at = now()` on the application.

### `config.toml`

No changes needed — Lovable managed functions deploy automatically.

## Wiring

- Payment Reminder button → existing `supabase.functions.invoke("new-member-reminder", …)` call.
- Application Completed button → new `supabase.functions.invoke("new-member-welcome", …)` call.
- Both call sites toast success/error and refetch the applications list.

## Verification

- `tsgo` typecheck.
- Manual: open `/new-member-applications`, confirm days badge; on a pending applicant send the payment reminder (dev only) and confirm `reminder_sent_at` updates and the CTA URL matches the applicant's quarter; on a `fees_verified=true` applicant send the welcome and confirm `welcome_sent_at` sets and the button locks.

## Out of scope

- No re-send / unlimited-send flow (locked to once per applicant per your answer).
- No changes to the queue dispatcher (it already forwards `cc`).
- No new template registry entry — these are raw HTML enqueued directly, matching the existing `new-member-reminder` pattern.
