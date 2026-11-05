# Resources — new Member Service

## What members see
- New "Resources" item in Member Services, directly below Member Directory (hidden for restricted/overdue members like other services; count shown only when > 0).
- New Resources page with two groups: **Chapter** and **National**. Each entry shows the name (opens in a new tab), the web address domain, and a one-line description. Empty groups are hidden.
- Same flat, hairline style, 44px tap targets, Back-to-Home header.

## Website Configuration
- New collapsible "Resources" section, separate from the existing Links section (which stays unchanged).
- Add/edit/delete entries: name, web address, short description, category (Chapter / National).
- Manual ordering per category with up/down buttons.
- Editable by admins and officers.

## Technical details
- New table `resource_links` (id, name, url, description, category text check in ('chapter','national'), sort_order, timestamps, updated_at trigger) with GRANTs, RLS: active members + officers/admins can read; admins and officers can insert/update/delete via `has_role`.
- New page `src/pages/Resources.tsx`, route `/resources`; menu entry in `MemberHome.tsx`.
- New `src/components/admin/ResourceLinksAdmin.tsx` used inside `SiteConfig.tsx`; ensure officers can reach that section.
- Version bump to next v26.11.xx.
