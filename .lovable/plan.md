## Add Member Activity List to Engagement Page

Extend the Member Engagement admin page (`src/pages/MemberEngagement.tsx`) with a sortable table showing every member who has used the app and how many times.

### What the user will see

A new "Member Activity" section below the existing trend chart, containing a table with:

- Member name (linked to their profile)
- Total events (all-time)
- Events in last 30 days
- Events in last 7 days
- Last seen (relative time, e.g. "2 hours ago")

The table is sorted by "Last seen" descending by default, with column headers clickable to re-sort. A search box filters by name. A CSV export button downloads the full list.

### Technical details

1. **New database function** `engagement_by_member()` (SECURITY DEFINER, admin/officer only) returning per-member aggregates:
   ```
   key_id, first_name, last_name, total_events, events_30d, events_7d, last_seen
   ```
   Joins `member_engagement_events` with `roster_members`, groups by `key_id`. Only includes members with at least one event.

2. **Frontend** in `MemberEngagement.tsx`:
   - New `useQuery` calling `supabase.rpc("engagement_by_member")`
   - Reuse existing shadcn `Table` component
   - Client-side sort + search (list will be a few hundred rows max)
   - CSV export via existing pattern in `src/lib/export.ts`

### Out of scope

- No tracking of *which* pages each member visited (only counts). If you want a per-event-type breakdown per member, that's a follow-up.
- No changes to what gets tracked — uses existing `member_engagement_events` data.
