# Improve Buddy Program Email Communications

## Background — is this possible on Lovable's infra now?
Yes. The shared `process-email-queue` worker already forwards `cc` and `bcc` fields from the queue payload to the email provider. We don't need to change any email infrastructure — only the buddy-specific send function.

## Goal
Send a **single email** that both the buddy and the new member receive together, with both addresses visible in the headers, so **Reply All works** and they can converse directly. Membership keeps a silent archive copy.

## Changes

### 1. One message, both participants visible — `supabase/functions/buddy-email-send/index.ts`
Replace today's "three separate single-recipient sends" with **one enqueued email per (assignment, email_type)**:

- `to`: new member's email
- `cc`: buddy's email   *(safer than a comma-joined To: most providers and inboxes render Cc on the same message, and Reply-All still reaches both)*
- `bcc`: `membership@eaa84.org` (silent archive)
- `reply_to`: **unset** (so Reply-All naturally goes to both participants)
- `from`: unchanged — `EAA Chapter 84 <notify@notify.eaa84.org>`
- One `idempotency_key`: `buddy-<assignment_id>-<email_type>`
- One `message_id` (no per-audience suffix)
- One unsubscribe token, generated for the primary recipient (new member)

Result: both the new member and the buddy see each other in the message headers, can hit Reply All, and membership@ gets a hidden copy for the record.

### 2. Fix the reminder template key mismatch
Today the admin UI labels the second template **"3-Day Reminder Email"** with `template_key = 'reminder'`, but `buddy-email-send` only accepts `email_type` ∈ `{ 'intro', 'check_in' }` and looks up `template_key = 'check_in'`. The reminder template can never actually be sent.

Reconcile on **`reminder`** end-to-end:
- Edge function accepts `email_type` ∈ `{ 'intro', 'reminder' }` and looks up `template_key = email_type`.
- DB migration: if a row with `template_key = 'check_in'` exists, rename it to `reminder`; ensure a `reminder` row exists.
- Search for any caller (cron/trigger/UI) passing `check_in` and update to `reminder`.

### 3. Unchanged
- `buddy_email_log` still records one row per `(assignment_id, email_type)`.
- Placeholders (`[NewMemberName]`, `[BuddyName]`, `[NewMemberEmail]`, `[BuddyEmail]`) unchanged.
- HTML escaping + mailto linkification unchanged.
- Admin UI for editing templates unchanged.
- No changes to queue worker, RLS, or auth.

## Verification
1. Trigger an intro email on a test assignment from the officer UI.
2. Confirm `email_send_log` shows **one** row (not three).
3. In both inboxes: new member appears in `To:`, buddy appears in `Cc:`, Reply-All composes to the other participant. Membership@ receives a Bcc copy with no Bcc shown to participants.
4. Trigger the reminder email and confirm it now sends.

## Out of scope
- No template copy changes (admins keep editing subject/body in Site Config).
- No changes to who/when the reminder fires; only fixing the broken key so it can fire at all.
