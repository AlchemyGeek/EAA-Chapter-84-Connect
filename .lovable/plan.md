# Hangar Talk — Implementation Plan

Build the community feed as a self-contained module that mirrors Classifieds conventions (cards, badges, hairline borders, mobile-first). All new code lives in dedicated files and routes — no changes to unrelated features.

## Scope decisions (from your answers)

- Posting and replying: **Active members only** (gated like other member services).
- Authors can **edit and delete** their own posts and replies.
- Entry point: **Member Home tile** + `/hangar-talk` route.
- Profile Tags: **Admin tag manager** in Site Config, seeded with a proposed starter list (below) for your review.

## Database (new objects only — nothing existing is touched)

New tables (all RLS-enabled, with explicit GRANTs):

- `hangar_talk_posts` — `id`, `author_key_id`, `type` (`question` | `help_wanted` | `fyi`), `title`, `body`, `resolved_at`, `last_activity_at`, `created_at`, `updated_at`
- `hangar_talk_post_images` — `id`, `post_id`, `storage_path`, `position`, `created_at`
- `hangar_talk_replies` — `id`, `post_id`, `author_key_id`, `body`, `image_storage_path` (nullable), `created_at`, `updated_at`
- `hangar_talk_tag_categories` — `id`, `slug` (`aircraft` | `ratings` | `build_experience` | `interests`), `label`, `position`
- `hangar_talk_tags` — `id`, `category_id`, `label`, `position`, `archived`
- `hangar_talk_member_tags` — `key_id`, `tag_id` (composite PK)

Triggers:
- `updated_at` maintenance on posts/replies.
- On reply insert: set parent post `last_activity_at = now()`.
- On post resolve: stamp `resolved_at`.

RLS (gated via existing `has_role` / `is_officer` and Active-standing check against `roster_members`):
- Read posts/replies/images/tags: any authenticated Active member.
- Insert/update/delete own post or reply: author + Active standing; admins/officers can delete any (for moderation hygiene).
- Tag categories/tags: read for all authenticated; write for admins only.
- `hangar_talk_member_tags`: a member can manage only their own; admins can manage any.

New storage bucket: `hangar-talk` (private), with per-member-folder upload policy mirroring the `classifieds` bucket pattern.

## Proposed starter tag list (for your review before seeding)

- **Aircraft** — Cessna 150/152, Cessna 170/180/185, Cessna 172, Cessna 182, Piper Cherokee/Archer, Piper Cub, Beechcraft Bonanza, RV-3/4/6/7/8/9/10/14/15, Sonex, Van's Other, Zenith, Kitfox, Glasair, Lancair, Sling, Bearhawk, Tailwheel (other), Light Sport (other), Experimental (other), Warbird, Glider, Helicopter, Ultralight, None yet
- **Ratings & Qualifications** — Student Pilot, Sport, Recreational, Private, Instrument, Commercial, ATP, CFI, CFII, MEI, Multi-Engine, Seaplane, Glider, Helicopter, Tailwheel, High Performance, Complex, A&P, IA, Repairman (Experimental), DPE, Flight Surgeon/AME
- **Build Experience** — Sheet Metal, Composites, Tube & Fabric, Wood, Welding, Electrical/Wiring, Avionics, Engines, Painting, Upholstery/Interior, Inspections, Restoration, First-time builder, Repeat builder
- **Interests** — Young Eagles, Eagle Flights, Fly-ins, Formation Flying, Cross-country, Backcountry, Aerobatics, Warbirds, Tech Counselor, Flight Advisor, Mentoring new builders, Workshops/EAA SportAir, Camping with airplane, Photography, Hangar projects

You can revise this list before I seed; admins can also edit it later in Site Config.

## Frontend

New files (all self-contained):

```text
src/pages/HangarTalk.tsx              feed page (search, toggle, sections)
src/pages/HangarTalkPost.tsx          full post view + replies
src/pages/HangarTalkNew.tsx           create post form
src/pages/HangarTalkEdit.tsx          edit own post
src/components/hangar-talk/
  PostCard.tsx, PostRow.tsx, TypeBadge.tsx, FeedToggle.tsx,
  SectionHeader.tsx, ReplyList.tsx, ReplyComposer.tsx,
  ImageUploader.tsx, EmptyState.tsx
src/components/member/ProfileTags.tsx    tag picker section on MemberDetail
src/components/admin/HangarTalkTagsAdmin.tsx  Site Config panel
src/lib/hangarTalk/{api.ts,types.ts}
```

Routing (additive in `src/App.tsx`):
- `/hangar-talk`, `/hangar-talk/new`, `/hangar-talk/:id`, `/hangar-talk/:id/edit`

Member Home: add one tile linking to `/hangar-talk` (only change outside the module).
MemberDetail: add a "Profile Tags" section using `ProfileTags.tsx` — self-edit only on the viewer's own profile.
Site Config: add a collapsible "Hangar Talk Tags" admin panel.

Behavior details from spec:
- Feed grouped Fresh → Active → Resolved as scroll dividers (not tabs).
- 14-day no-activity → reduced opacity on cards/rows.
- Search queries title+body across all posts (ILIKE for v1 — no tsvector unless you want it).
- Card/list toggle is a small icon toggle, state persisted in `localStorage`.
- Type badges: Question (blue), Help Wanted (amber), FYI (neutral) — using existing token palette.
- Mobile-first, 44px tap targets, hairline borders, no shadows.

## Out of scope (explicit)

No notifications, no email, no AI, no moderation tools, no member matching, no pinning — matches the spec's deferred list. No edits to roster, auth, classifieds, dues, buddy, newsletters, or any other module.

## Sequencing (separate approvals)

1. Confirm/edit the starter tag list above.
2. Migration #1: tables + RLS + GRANTs + storage bucket/policies.
3. Seed tag categories + tags (data insert).
4. Frontend module + Site Config admin panel + MemberHome tile + ProfileTags section.
5. QA pass on mobile preview.

Reply with edits to the tag list (or "looks good") and I'll switch to build mode and start with the migration.
