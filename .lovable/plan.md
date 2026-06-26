# Hangar Talk — Subscriptions & Daily Digest

Adds per-thread subscriptions to Hangar Talk, with a once-a-day digest email summarizing new activity. Email infra reuses the existing Lovable Emails pipeline (`notify.eaa84.org` + `enqueue_email` + `process-email-queue`). Auto-login on "View Thread" via a short-lived signed token. Subscription management lives in-thread (no separate page).

---

## 1. Subscribe Toggle (in-thread)

- Add a Subscribe control on the full post view (`HangarTalkPost.tsx`) — bell icon + "Subscribe"/"Subscribed" label, secondary styling, near the post header.
- Single tap toggles state with optimistic UI + toast on failure.
- Auto-subscribe rules:
  - When a member creates a post → toggle subscription to on.
  - For everybody else default subscription toggle is off
- On the Hangar Talk list page (`HangarTalk.tsx`), show a small bell badge on rows the current member is subscribed to (per user's directive — no separate "manage subscriptions" page).

## 2. Daily Digest Email

- Runs once per day (early morning, chapter local time) via pg_cron calling a new edge function `hangar-talk-digest`.
- For each subscriber, gather subscribed threads with replies created after `last_notified_at` (or subscription creation if never notified). Skip the recipient entirely if there's no new activity.
- One email per recipient per day, max. Update `last_notified_at` after enqueue.
- Enqueue via existing `enqueue_email('transactional_emails', ...)` so suppression list, retries, and unsubscribe footer all reuse the existing pipeline.
- Email content per thread section: type badge, title, new-reply count, latest reply preview (author + truncated text), **View Thread** button (signed auto-login link), and a small "Unsubscribe from this thread" link (signed token, one-click GET).
- Footer: standard Connect branding + "Unsubscribe from all Hangar Talk emails" (bulk action, signed token).

## 3. Auto-Login "View Thread" Link

- Signed short-lived token (HMAC over `{key_id, post_id, exp}` with 7-day expiry) baked into the link.
- New edge function `hangar-talk-auth-redirect` validates the token, creates a Supabase session for the matching roster email via `admin.generateLink` / `setSession`, sets cookies, then 302 → `/hangar-talk/<post_id>`.
- If token expired/invalid → redirect to `/auth` with a friendly message; user signs in via normal OTP.

## 4. Per-Thread / Bulk Unsubscribe from Email

- Per-thread unsubscribe link uses a signed token; GET endpoint deletes that one subscription, shows a branded confirmation page.
- "Unsubscribe from all" uses a signed token; deletes all the recipient's Hangar Talk subscriptions and shows confirmation.
- Both are no-auth-required (token is the proof) and are separate from the global email suppression list — they only touch Hangar Talk subscriptions, so future manual subscribes still work.

## 5. Privacy

- Subscriptions are private. RLS restricts SELECT/INSERT/DELETE to `auth.uid()` of the owning member. Officers/admins do NOT get visibility.
- Service role (used by the digest function) bypasses RLS as usual.

---

## Technical Details

### New table

```sql
create table public.hangar_talk_subscriptions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references hangar_talk_posts(id) on delete cascade,
  key_id integer not null references roster_members(key_id) on delete cascade,
  created_at timestamptz not null default now(),
  last_notified_at timestamptz,                 -- last time included in a digest
  unique (post_id, key_id)
);

grant select, insert, delete on public.hangar_talk_subscriptions to authenticated;
grant all on public.hangar_talk_subscriptions to service_role;
alter table public.hangar_talk_subscriptions enable row level security;

-- Owner-only RLS scoped by roster email
create policy "own subs select" on public.hangar_talk_subscriptions
  for select to authenticated using (public.is_roster_self(key_id));
create policy "own subs insert" on public.hangar_talk_subscriptions
  for insert to authenticated with check (public.is_roster_self(key_id));
create policy "own subs delete" on public.hangar_talk_subscriptions
  for delete to authenticated using (public.is_roster_self(key_id));

create index on public.hangar_talk_subscriptions(key_id);
create index on public.hangar_talk_subscriptions(post_id);
```

### Auto-subscribe triggers

- `after insert on hangar_talk_posts` → insert subscription for author's `key_id`.
- `after insert on hangar_talk_replies` → upsert subscription for reply author's `key_id` (on conflict do nothing).

### New secret

- `HANGAR_TALK_LINK_SECRET` — HMAC signing key for both auto-login and unsubscribe tokens. Generated via `generate_secret` (64 chars).

### New edge functions

- `hangar-talk-digest` (cron, service role) — assembles per-recipient digests and calls `enqueue_email`. Renders raw HTML inline (same pattern as `notify_new_member_application`) so it works with the existing queue without a React Email template.
- `hangar-talk-auth-redirect` — verifies signed login token, mints session, 302 to thread.
- `hangar-talk-unsubscribe` — verifies signed unsub token; supports `scope=thread|all`; deletes rows; returns a small HTML confirmation page.

### Cron

- pg_cron job `hangar_talk_digest_daily` at e.g. 12:00 UTC (≈ 06:00 Central) invoking the digest function. Created via migration alongside infra.

### Frontend

- `src/lib/hangarTalk/subscriptions.ts` — `subscribe(postId)`, `unsubscribe(postId)`, `isSubscribed(postId)`, `useSubscribedPostIds()` hook.
- `HangarTalkPost.tsx` — add SubscribeToggle component.
- `HangarTalk.tsx` / `PostRow.tsx` — render bell badge when the row's `post.id` is in the subscribed set.
- `HangarTalkNew.tsx` / `ReplyComposer.tsx` — no client changes needed; triggers handle auto-subscribe.

### Out of scope (per spec)

- Real-time / immediate notifications
- Push notifications
- Per-post frequency settings
- Officer visibility into subscription data
- Dedicated subscriptions management page (intentionally replaced by in-thread toggle + bell badges)