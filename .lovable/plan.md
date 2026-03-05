

## Membership Statistics for Officers

### Overview
Add a new "Officer Services" section on the Member Home page (visible only to members listed in `chapter_leadership`) with a link to a new Membership Statistics page. The statistics page will show KPIs and a chart derived from roster data.

### How Officers Are Identified
A user is an officer if their `key_id` exists in the `chapter_leadership` table. We'll add a query in `MemberHome` to check this.

### Changes

**1. New hook: `src/hooks/useIsOfficer.ts`**
- Query `chapter_leadership` for the current member's `key_id`
- Return `isOfficer` boolean

**2. Update `src/pages/MemberHome.tsx`**
- Import and use `useIsOfficer`
- Add an "Officer Services" card section between "Member Services" and "Admin Tools", visible when `isOfficer && !isInactive`
- Contains a link to `/membership-stats` with a BarChart3 icon and "Membership Statistics" label

**3. New page: `src/pages/MembershipStatistics.tsx`**
- Protected route (requires auth + officer check)
- **KPI section** (top): Four cards in a 2×2 grid showing:
  - **Members in Good Standing** — `current_standing = 'Active'` AND `expiration_date` is next year or beyond
  - **Yet to Renew** — `current_standing = 'Active'` AND `expiration_date` is this calendar year
  - **New Members This Year** — `date_added` is within the current calendar year
  - **Inactive Members** — `current_standing != 'Active'` OR `expiration_date` is in the past
- All computed client-side from a single query of `roster_members`

- **Chart section** (bottom): Bar chart using Recharts showing "Members Renewed by Month"
  - Parse `udf1` field with regex to extract payment dates (format variations like `1/15/2025 $50/sq`, `02/03/2025 45/cash`, etc.)
  - Group by month for the current year
  - Display as a bar chart with month labels

**4. Update `src/App.tsx`**
- Add route `/membership-stats` inside the `AppLayout` wrapper

### UDF1 Parsing Logic
The `udf1` field contains hand-written payment info. The parser will:
- Use regex: `/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/` to extract dates
- Filter to current year
- Group counts by month (Jan–Dec)
- Tolerate missing or malformed entries gracefully

### Tech Details
- KPIs use existing `roster_members` table — no schema changes needed
- Chart uses the existing Recharts + ChartContainer components from `src/components/ui/chart.tsx`
- The page will be wrapped in `AppLayout` (sidebar header with back arrow)

