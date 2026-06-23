## Goal

Switch Buddy emails from the Lovable Emails queue (`notify@notify.eaa84.org`) to Resend (`noreply@connect.eaa84.org`), and use a single combined email with **To: buddy + new member, BCC: membership@eaa84.org** instead of two separate sends.

This is a tightly-scoped, Buddy-only change. All other emails (auth, new member application notifications, queue infrastructure) stay on the existing Lovable Emails path. We'll revisit those separately.

## Behavior changes

Today (per assignment + email_type):
- Two separate enqueues into `transactional_emails` (one to new member, one to buddy)
- Each has the other person as `Reply-To`, BCC: membership@eaa84.org
- From: `EAA Chapter 84 <notify@notify.eaa84.org>`

After:
- **One** Resend API call per send
- To: `[newMember, buddy]`
- BCC: `membership@eaa84.org`
- Reply-To: both addresses, so "Reply All" continues the 3-way thread naturally
- From: `EAA Chapter 84 <noreply@connect.eaa84.org>`
- Still gated by the existing `buddy_email_log` idempotency check, still requires officer/admin, still uses the existing `buddy_email_templates` and `[NewMemberName]/[BuddyName]/[NewMemberEmail]/[BuddyEmail]` placeholders.

No DB schema changes. No queue/cron changes. No UI changes.

## Technical details

1. **Edit `supabase/functions/buddy-email-send/index.ts`**
   - Remove the per-recipient loop and the `enqueue_email` RPC call.
   - Remove `getOrCreateUnsubscribeToken` and the unsubscribe-token plumbing (Buddy emails are 1-of-2 lifecycle messages between two named individuals — an unsubscribe link is not meaningful here, and Resend's account-level suppression still applies).
   - Build one Resend payload:
     ```ts
     {
       from: 'EAA Chapter 84 <noreply@connect.eaa84.org>',
       to: [newMemberEmail, buddyEmail],
       bcc: ['membership@eaa84.org'],
       reply_to: [newMemberEmail, buddyEmail],
       subject: processedSubject,
       html: htmlBody,
       text: plainTextBody,
       headers: { 'X-Entity-Ref-ID': `buddy-${assignment_id}-${email_type}` },
       tags: [{ name: 'category', value: `buddy_${email_type}` }],
     }
     ```
   - POST to `https://api.resend.com/emails` with `Authorization: Bearer ${RESEND_API_KEY}` (the same secret the working `resend-test` function uses).
   - On non-2xx Resend response: return 500 with Resend's error message; do NOT write to `buddy_email_log`.
   - On success: insert into `buddy_email_log` (unchanged) so the duplicate-send guard keeps working.

2. **Keep**:
   - Auth check (Bearer token → officer/admin or service role).
   - Idempotency check against `buddy_email_log` at the top.
   - Template lookup + placeholder substitution + HTML escaping + mailto linkification.
   - Function name and request contract (`{ assignment_id, email_type }`) — no caller changes needed.

3. **Out of scope (explicitly NOT changing in this step)**:
   - `process-email-queue`, `send-transactional-email`, `auth-email-hook`, `new-member-notify`, the `notify_new_member_application` DB trigger, `volunteer-apply`, etc.
   - `resend-test` function (leave as-is for future ad-hoc testing).
   - `email_send_log` / `suppressed_emails` tables — Buddy sends won't write to them after this change. That's an accepted trade-off until we migrate the rest.

## Verification

After deploy:
1. From the Buddy admin UI, trigger an `intro` send on a test assignment where membership@eaa84.org is one of the addresses you can read, OR re-fire against a known assignment and confirm:
   - One Resend message ID returned (check function logs).
   - One copy each arrives at the new member, buddy, and membership@ inboxes.
   - Reply All from any of the three reaches the other two.
2. Try sending the same `assignment_id` + `email_type` again → should return "already sent" (idempotency guard intact).

## Rollback

Revert `buddy-email-send/index.ts` to the previous version (single-file change).
