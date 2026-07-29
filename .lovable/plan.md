# Squawk — Homepage Rotating Content Strip

A full-width single-slot carousel at the top of the Member Home page. Auto-advances every 6s, swipeable, refreshes on every load. Manual admin-authored content takes priority; auto-generated slides fill the rest.

## User-facing behavior

- Placement: top of `/home`, above the Status Dashboard, full-width single card.
- Carousel: 3–5 slides per session, one visible at a time, auto-advances every 6s, swipeable on touch, left/right arrow dots for keyboard/mouse. Pause on hover.
- Fresh on every homepage load — no read/unread, no dismiss.
- Subtle type distinction: same card, small uppercase label at the top of each card (e.g. "Announcement", "New Member", "Classifieds", "Hangar Talk", "Quote"). No accent colors.
- Interactions:
  - Announcement / What's New → clickable only if admin provided a link
  - Classifieds highlight → routes to `/classifieds/:id`
  - Hangar Talk highlight → routes to `/hangar-talk/:id`
  - Welcome new member → `mailto:<roster_email>?subject=Welcome to EAA Chapter 84!`
  - Quote → not clickable

## Priority / selection logic (client-side, on each load)

1. If any active manual entries exist (not expired), 1 takes the first slot. If 2+ active, up to 2 may appear.
2. Remaining slots filled from auto pool with weighting:
   - Welcome (any roster member joined in last 30 days) — high
   - Classifieds highlight (newest active listing OR one nearing expiration) — medium
   - Hangar Talk highlight (recent-reply thread OR open "Help Wanted") — medium
   - Quote — filler, always available
3. Within each type, random pick among eligible items so repeat visits feel varied.
4. Always render at least 3 slots — quotes repeat if pool is thin.

## Admin UI

New admin section on Site Config page: "Squawk announcements".

- List of active + expired entries, newest first
- Create form: Title (required, ≤80 chars), Short message (required, ≤200 chars), Link (optional URL), Type (Announcement / What's New), Expires in (weeks or months from now, dropdown: 1/2/4 weeks, 2/3/6 months)
- Edit / delete existing entries
- Expired entries shown greyed with "Expired" label; auto-hidden from carousel

Admin-only access, gated by existing `isAdmin` check.

## Data model

New public table `squawk_entries`:

```
id uuid pk default gen_random_uuid()
type text check in ('announcement','whats_new')
title text not null
message text not null
link text
created_by uuid references auth.users(id) on delete set null
created_at timestamptz default now()
expires_at timestamptz not null
```

Grants + RLS:
- `GRANT SELECT ON public.squawk_entries TO authenticated` (any signed-in member can read active entries for the carousel)
- `GRANT INSERT, UPDATE, DELETE ON public.squawk_entries TO authenticated` (guarded by policy)
- `GRANT ALL ON public.squawk_entries TO service_role`
- RLS enabled
- Policies:
  - `SELECT` for authenticated (all rows — needed so admin UI sees expired too; carousel filters client-side by `expires_at > now()`)
  - `INSERT/UPDATE/DELETE` only if `has_role(auth.uid(), 'admin')`

New static quote list `src/lib/squawk/quotes.ts` — seeded with placeholder aviation quotes now, user will provide the final list to paste in.

## Auto content queries

Consolidated fetch in `src/lib/squawk/build.ts` (React Query, 5-minute cache):

- Manual: `squawk_entries` where `expires_at > now()`
- Welcome: `roster_members` where `date_joined >= now() - 30 days` and `current_standing = 'Active'`, respecting `email_privacy` (skip if email hidden)
- Classifieds: `classifieds` where `status = 'active'`, prefer newest OR nearest to expiration
- Hangar Talk: `hangar_talk_posts` where `type = 'help_wanted' and resolved_at is null`, OR newest `last_activity_at`

## Files

New:
- `supabase/migrations/<ts>_squawk_entries.sql` — table + grants + RLS
- `src/lib/squawk/types.ts`, `src/lib/squawk/quotes.ts`, `src/lib/squawk/build.ts` (selection + weighting)
- `src/components/squawk/Squawk.tsx` — carousel container (uses embla-carousel, already in deps via shadcn)
- `src/components/squawk/SquawkSlide.tsx` — single card renderer per type
- `src/components/admin/SquawkAdmin.tsx` — admin CRUD panel

Edited:
- `src/pages/MemberHome.tsx` — mount `<Squawk />` at top, above status card
- `src/pages/SiteConfig.tsx` — add collapsible "Squawk announcements" section for admins
- `src/integrations/supabase/types.ts` — regenerated after migration

## Out of scope (per spec)

- Dismiss / read state
- Personalization / targeting
- Admin-editable quote pool (user provides static list)
- Distinct accent colors per type (using subtle label only)
