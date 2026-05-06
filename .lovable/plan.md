## Reorganize Officer Services into Subsections

In `src/pages/MemberHome.tsx`, restructure the "Officer Services" card so its contents are grouped under three labeled subsections, in this order:

### Chapter Operations

- Membership Due Payment → `/dues-payment`
- 2026 Membership Badges → `/membership-badges`
- Chapter  Volunteering → `/volunteering-opportunities`
- Newsletters → `/newsletters-admin`

### New Members

- Applications (with pending count badge) → `/new-member-applications`
- Buddy Program → `/buddy-program`

### Insights

- Membership Statistics → `/membership-stats`
- Member Engagement → `/member-engagement`

### Visual treatment

- Keep the single outer "Officer Services" card and its current header.
- Each subsection rendered as a small uppercase muted-foreground label (e.g. `text-xs font-medium uppercase tracking-wide text-muted-foreground`) above its links, with light vertical spacing between groups. No nested cards, no dividers — keeps the flat aesthetic and hairline style.

### Title suggestions

Current labels are clear; one optional tweak: rename "Membership Due Payment" → **"Membership Dues"** for consistency with the section name. Confirm or skip.

### Out of scope

No route, permission, or business-logic changes. Admin Tools card untouched.