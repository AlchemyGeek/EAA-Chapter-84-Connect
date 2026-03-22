

## Buddy Program Emails: Intro + Reminder with Admin-Editable Templates

### Overview
When a buddy is assigned or reassigned, the system sends two emails: an intro email immediately and a reminder email after 3 days. Email templates are editable by admins in Website Configuration. During the test phase, emails go to `membership@eaa84.org` with the actual recipients shown in the email body.

### 1. Database: New tables (migration)

**`buddy_email_templates`** — Stores the two editable email templates
- `id` (uuid, PK)
- `template_key` (text, unique) — `'intro'` or `'reminder'`
- `subject` (text)
- `body` (text) — supports `[NewMemberName]` and `[BuddyName]` placeholders
- `updated_at` (timestamptz)
- RLS: admins can manage, authenticated can read

Seed with default intro and reminder content.

**`buddy_email_log`** — Tracks which emails have been sent per assignment
- `id` (uuid, PK)
- `assignment_id` (uuid, references buddy_assignments)
- `email_type` (text) — `'intro'` or `'reminder'`
- `sent_at` (timestamptz, default now())
- RLS: officers/admins can read and insert

### 2. Edge Function: `buddy-email-send`

A new edge function that:
1. Accepts `{ assignment_id, email_type }` (intro or reminder)
2. Looks up the assignment → gets new member name/email and buddy name/email from roster
3. Fetches the matching template from `buddy_email_templates`
4. Replaces `[NewMemberName]` and `[BuddyName]` placeholders
5. **Test phase**: Sends to `membership@eaa84.org` with first line in body showing `To: buddy@email.com, new_member@email.com CC: membership@eaa84.org`
6. Uses Resend API (already configured) to send the email from `notify@notify.eaa84.org`
7. Logs the send in `buddy_email_log`

### 3. Scheduled Reminder: `buddy-reminder-cron`

A new edge function triggered by pg_cron (daily) that:
1. Finds assignments where intro was sent 3+ days ago but no reminder sent yet
2. Calls `buddy-email-send` for each pending reminder

### 4. UI: Buddy Program page updates (`BuddyProgram.tsx`)

In the New Members list, each assignment row shows email status tags:
- **"Intro Sent"** (green badge) — when intro email logged
- **"Reminder Sent"** (blue badge) — when reminder email logged
- No tag if not yet sent

Add a "Send Intro" button on each assignment that triggers the intro email manually. This allows officers to control when the first email goes out.

### 5. UI: Website Configuration — Buddy Program section (`SiteConfig.tsx`)

Add a new "Buddy Program Emails" card with:
- Two editable templates (intro and reminder), each with subject + body (textarea)
- Display placeholder reference: `[NewMemberName]`, `[BuddyName]`
- Edit via dialog, save to `buddy_email_templates`

### 6. Future switchover notes

When ready to go live:
- Change the edge function to send to actual participants with CC/Reply-To headers
- Remove the test-phase "To:/CC:" first line from the body

### Technical Details

- Email sending uses the existing Resend API key (already in secrets)
- The edge function sends directly via Resend (not through the transactional email system) since these emails need custom CC/Reply-To headers for the future reply-all workflow
- pg_cron job runs daily to check for pending 3-day reminders
- Template placeholders are simple string replacement before sending

