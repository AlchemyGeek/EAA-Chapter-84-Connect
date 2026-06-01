## Mobile-friendly Member Activity list

On the `/member-engagement` page, the "Member Activity" table overflows horizontally on small screens and the scrollbar is hard to use. Replace the horizontal scroll with a responsive layout.

### Change

In `src/pages/MemberEngagement.tsx`:

- **Mobile (`< sm`)**: render each member as a stacked card row instead of a table:
  - Top line: member name (linked to profile) + "Last seen" on the right
  - Email below name in muted text
  - Bottom line: three small stat chips — `Total · 12`, `30d · 4`, `7d · 1`
  - Sort controls become a compact dropdown (Sort by: Last seen / Total / 30d / 7d / Name, with asc/desc toggle button)
- **Desktop (`sm+`)**: keep the existing sortable table exactly as is.

Search input and CSV export stay on top for both layouts. No data/query changes.

### Out of scope

- No changes to KPIs, trend chart, or database functions.
