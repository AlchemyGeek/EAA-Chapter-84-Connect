## Member Engagement Dashboard — Plan

### Overview

Create a new "Member Engagement" page accessible from Admin Services that tracks member activity via a lightweight event logging table and displays KPIs with trend charts.

### What counts as "activity"

Since the app doesn't currently track member interactions, we need to introduce a simple event logging mechanism. Events will be recorded when members perform meaningful actions:

- **Login / page visit** to `/home` (Member Hub)
- **Viewing Member Services** pages (directory, volunteering)
- **Editing profile** fields
- **Submitting volunteering applications**
- **Viewing member profiles** in the directory

Any future member services should include this instrumentation.

### Database Changes (1 migration)

**New table: `member_engagement_events**`

- `id` (uuid, PK)
- `key_id` (integer, NOT NULL) — the roster member
- `event_type` (text, NOT NULL) — e.g. `login`, `profile_edit`, `directory_view`, `volunteering_apply`, `service_page`
- `created_at` (timestamptz, default now())

RLS policies:

- Members can INSERT their own events (key_id matches their roster record)
- Officers/admins can SELECT all events
- Service role has full access

Enable realtime: not needed (batch analytics only).

**New database function: `engagement_kpis()**` (SECURITY DEFINER)
Returns a single row with pre-computed KPIs:

- `active_30d` — distinct members with ≥1 event in last 30 days
- `active_7d` — distinct members with ≥1 event in last 7 days
- `total_active_members` — count of roster members with standing = 'Active'
- `highly_engaged_30d` — distinct members with ≥5 events in last 30 days
- `dormant_60d` — active roster members with zero events in last 60 days
- `service_page_views_30d` — count of `service_page` events in last 30 days

**New database function: `engagement_trend()**` (SECURITY DEFINER)
Returns weekly buckets (last 12 weeks) with active member counts per week for trend charting.

### Frontend Changes

1. **New page: `src/pages/MemberEngagement.tsx**`
  - KPI cards row: Active (30d), Weekly Active, Engagement Rate %, Highly Engaged, Dormant, Service Page Views
  - Trend chart: Line chart showing weekly active members over time (recharts, same pattern as MembershipStatistics)
  - Uses existing `ChartContainer` components
2. **Route registration in `App.tsx**`
  - Add `/member-engagement` inside the `AppLayout` route group
3. **Navigation link in `MemberHome.tsx**`
  - Add "Member Engagement" link under Admin Services section with an `Activity` icon
4. **Event tracking hook: `src/hooks/useTrackEngagement.ts**`
  - Simple hook: `useTrackEngagement(eventType)` — fires once per mount (debounced, max 1 per event type per session via sessionStorage)
  - Looks up caller's key_id from roster, inserts into `member_engagement_events`
5. **Instrument existing pages** (add one-line hook calls):
  - `MemberHome.tsx` → track `login`
  - `Members.tsx` (directory) → track `directory_view`
  - `MemberVolunteering.tsx` → track `service_page`
  - `MemberProfile.tsx` → track `profile_view`

### Technical Details

- The engagement tracking hook uses `sessionStorage` to avoid duplicate events within the same browser session
- KPI queries use the SECURITY DEFINER function to avoid RLS overhead on aggregation
- The trend chart reuses the existing `ChartContainer` and `LineChart` pattern from MembershipStatistics
- Zero-stale-time caching for the engagement dashboard (consistent with other admin dashboards)

### Files to Create/Modify

- **Create**: Migration SQL (table + functions)
- **Create**: `src/hooks/useTrackEngagement.ts`
- **Create**: `src/pages/MemberEngagement.tsx`
- **Modify**: `src/App.tsx` (add route)
- **Modify**: `src/pages/MemberHome.tsx` (add nav link + track login)
- **Modify**: `src/pages/Members.tsx` (track directory_view)
- **Modify**: `src/pages/MemberVolunteering.tsx` (track service_page)
- **Modify**: `src/pages/MemberProfile.tsx` (track profile_view)