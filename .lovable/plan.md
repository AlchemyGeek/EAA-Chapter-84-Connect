# Classifieds Pass 2 — Authoring, Editing, Moderation (Real Backend)

This pass replaces the in-memory mock store from Pass 1 with a real Postgres-backed feature, adds the Post / Edit / Delete / Renew / Hide flows, and wires the My Listings tab and officer controls. Pass 1 routes, components, and visuals stay; only their data source changes.

## What's being built

### New routes
- `/classifieds/new` — Post a new listing (any authenticated active member)
- `/classifieds/:id/edit` — Edit a listing (author, officer, or admin only)

### Page 3 — Post a New Listing
- Standard Connect shell, "← Back to Classifieds", H1 "Post a Classified", single-column form (max-w 680px).
- **Phone nudge banner** at top of form, only when current member's `cell_phone` is missing OR `cell_phone_private = true` OR `member_chapter_data.contact_visible_in_directory = false`. Dismissible per session via sessionStorage. Links to the member's profile page.
- Fields: Title (≤100 chars, char counter), Category (required dropdown — 8 options from Pass 1), Tags (multi-select pill toggles, optional, 10 options from Pass 1), Description (textarea, min 20 chars), Photos (up to 4, drag-drop + picker, thumbnails with × remove), Duration (segmented 1/2/3 months, default 1, dynamic "Your listing will expire on …" preview).
- Validation via zod. Inline errors on submit.
- Submit → insert listing + uploaded photos, navigate to `/classifieds/:id`, toast "Your listing has been posted."

### Page 4 — Edit a Listing
- Same form. Pre-populated. Existing photos shown as thumbnails with × remove; new ones can be added up to 4 total.
- Access guard: if not author and not officer/admin → redirect to `/classifieds/:id`.
- Officer/admin editing someone else's listing: subtle banner "You are editing a listing posted by [Member Name]. Changes are immediate." Hide/Unhide toggle visible inline.
- "Danger zone" section with divider: **Delete this listing** → AlertDialog confirm → delete + redirect to `/classifieds` with toast.
- Save → toast "Your listing has been updated."

### My Listings tab (Pass 1 wiring)
- Active card: Edit · Delete (confirm dialog).
- Expired card: Renew (existing RenewDialog 1/2/3 months) · Edit · Delete.
- Hidden card (officer view): Unhide · Edit · Delete.
- All actions update DB and refresh React Query cache.

### Officer / Admin moderation (wiring Pass 1 surfaces)
- Detail page OfficerToolbar: Edit links to `/classifieds/:id/edit`; Delete and Hide/Unhide call DB.
- Listings list: hidden listings still hidden from non-officers; officers see them across tabs with "Hidden" badge.
- All moderation actions are immediate. No author notification, no audit log this pass.

### Toasts
Exact strings per spec (posted / updated / deleted / renewed with date / hidden / restored).

## Technical Section

### Database schema (new migration)

```sql
-- enums
create type classified_category as enum (
  'for-sale','wanted','hangar-space','services','training',
  'expertise-help','free-giveaway','miscellaneous'
);
create type classified_status as enum ('active','expired','hidden');

-- tags as text[] with CHECK against allowed set
create table public.classifieds (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  description text not null check (char_length(description) >= 20),
  category classified_category not null,
  tags text[] not null default '{}',
  status classified_status not null default 'active',
  author_key_id integer not null,        -- roster_members.key_id
  author_name text not null,             -- snapshotted at create
  author_email text not null,            -- snapshotted at create
  author_phone text,                     -- nullable, snapshotted
  author_phone_visible boolean not null default false,
  posted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.classifieds (status, expires_at);
create index on public.classifieds (author_key_id);

create table public.classified_photos (
  id uuid primary key default gen_random_uuid(),
  classified_id uuid not null references public.classifieds(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index on public.classified_photos (classified_id, sort_order);
```

**RLS**

- `classifieds`
  - SELECT (authenticated): `status <> 'hidden'` OR caller is author OR `has_role(auth.uid(),'admin')` OR `is_officer(auth.jwt()->>'email')`.
  - INSERT: `author_key_id` resolves to caller via `roster_members` (case-insensitive email match) AND caller is `current_standing='Active'`.
  - UPDATE: caller is author (by key_id ↔ email) OR admin OR officer.
  - DELETE: same as UPDATE.
- `classified_photos`: SELECT mirrors parent listing visibility; INSERT/DELETE allowed when caller can update parent.

**Status maintenance**: client-side filter treats listings with `expires_at <= now()` and `status='active'` as expired for display. A scheduled flip is out of scope; the simple `status` field tracks Hidden vs Active vs Expired-by-officer. Renew sets `status='active'` and bumps `expires_at`.

### Storage

- New private bucket `classifieds` (mirrors `member-images` pattern).
- Storage RLS policies on `storage.objects` for bucket `classifieds`:
  - SELECT: any authenticated user (gallery is visible to all signed-in members; aligns with detail page).
  - INSERT: authenticated; the path must start with `<author_key_id>/…` matching caller's roster `key_id`.
  - UPDATE/DELETE: author by path prefix OR admin/officer (via `has_role` / `is_officer`).
- Path convention: `classifieds/<author_key_id>/<classified_id>/<uuid>.<ext>`. Display uses signed URLs (1 hour) requested in the React Query loader, mirroring existing `MemberImageGallery` behavior.

### Frontend changes

- **Replace** `src/lib/classifieds/store.tsx` (in-memory) with React Query hooks in `src/lib/classifieds/api.ts`:
  - `useListings(filters)`, `useListing(id)`, `useCreateListing`, `useUpdateListing`, `useDeleteListing`, `useRenewListing`, `useToggleHidden`.
  - Each mutation invalidates `["classifieds"]` and `["classifieds", id]`.
  - `staleTime: 0` per project caching policy for admin/moderation views.
- Remove `ClassifiedsProvider` wrapper from `App.tsx` and the import; keep all consumer components but switch them to the new hooks.
- Update `src/lib/classifieds/types.ts` to align with DB column names (still expose camelCase via a mapper).
- New components:
  - `src/components/classifieds/ClassifiedForm.tsx` — shared form (used by Post + Edit) with zod schema.
  - `src/components/classifieds/PhoneNudgeBanner.tsx` — checks roster_members + member_chapter_data; sessionStorage dismiss key `classifieds-phone-nudge-dismissed`.
  - `src/components/classifieds/PhotoUploader.tsx` — drag-drop + picker, ≤4, preview, removes for both pending uploads and existing rows.
  - `src/components/classifieds/DeleteListingDialog.tsx` — AlertDialog confirmation.
- New pages:
  - `src/pages/ClassifiedNew.tsx`
  - `src/pages/ClassifiedEdit.tsx`
- Wire up `ClassifiedCard` actions on My Listings tab (Edit/Delete/Renew). Wire up `OfficerToolbar` on detail page. Replace `EmptyState` "Post a Classified" tooltip with a real link to `/classifieds/new`.
- Add routes inside the existing `AppLayout` group in `App.tsx`.

### Author identity & phone nudge

- On mount of `/classifieds/new` and on submit, look up the caller in `roster_members` by `auth.jwt().email` (case-insensitive) to obtain `key_id`, `first_name`, `last_name`, `cell_phone`, `cell_phone_private`. Join `member_chapter_data` for `contact_visible_in_directory`.
- Snapshot into `classifieds` row at insert time so the listing keeps the author's name/email/phone-visible state at the moment of posting (matches Pass 1 shape).

### Permissions matrix (enforced both client-side guards and DB RLS)

| Action | Author | Other member | Officer/Admin |
|---|---|---|---|
| View active/expired | yes | yes | yes |
| View hidden | own only | no | yes |
| Post | yes | yes | yes |
| Edit | own | no | any |
| Delete | own | no | any |
| Renew | own | no | no |
| Hide / Unhide | no | no | any |

### Out of scope (per spec)

Reminder emails, hide-notifications, listing caps, payments, audit log, scheduled status flip job.
