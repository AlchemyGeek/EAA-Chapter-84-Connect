

## Redesigned Member Detail Page

### Current State
The MemberDetail page is a dense, form-heavy layout showing every database field in editable card sections. This works for an admin data-entry tool but is poor for a member-facing mobile experience.

### Proposed UI Structure

```text
+------------------------------------------+
|  < Back          John Smith         Badge |
|                EAA #123456               |
+------------------------------------------+
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  MEMBERSHIP STATUS DASHBOARD     │    |
|  │                                  │    |
|  │  [Active / Good Standing]  ●     │    |
|  │  Expires: 03/10/2027            │    |
|  │  "You're covered through 2026"   │    |
|  │                                  │    |
|  │  — or if expired/inactive —      │    |
|  │                                  │    |
|  │  [Inactive]  ⚠                  │    |
|  │  Expired: 03/10/2025            │    |
|  │  "Your membership has lapsed.    │    |
|  │   Please renew."                 │    |
|  └──────────────────────────────────┘    |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  CONTACT INFO (read-only)        │    |
|  │  Email, Phone, Address           │    |
|  └──────────────────────────────────┘    |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  AVIATION (read-only)            │    |
|  │  Ratings, Aircraft, Volunteering │    |
|  └──────────────────────────────────┘    |
|                                          |
|  ┌──────────────────────────────────┐    |
|  │  SERVICES (role-dependent)       │    |
|  │  [ ] Young Eagle Pilot           │    |
|  │  [ ] VMC Club                    │    |
|  │  ...                             │    |
|  └──────────────────────────────────┘    |
+------------------------------------------+
```

### Status Dashboard Logic

The top card computes membership status from database fields:

- **Active + Good Standing**: `current_standing = "Active"` AND `expiration_date` is in the future (or covers the current calendar year — e.g., expires 03/10/2027 means good through 2026)
- **Active + Expiring Soon**: Expiration date is within 60 days — show amber warning with renewal nudge
- **Inactive / Lapsed**: `current_standing != "Active"` OR `expiration_date` is in the past — show red alert with renewal call-to-action

Visual treatment:
- Green banner with checkmark for good standing
- Amber/yellow banner for expiring soon
- Red banner for lapsed/inactive

### Section Breakdown

1. **Status Dashboard** (always visible, top) — computed status, expiration date, standing message
2. **Contact Info** — read-only display of email, phone, address (collapsed by default on mobile, using Accordion)
3. **Aviation** — read-only display of ratings, aircraft, volunteer flags
4. **Member Services** — the only editable section for a "member" role; role-dependent list of toggles/actions (to be defined in future iterations)

### Responsive Approach

- **Phone**: Single column, accordion sections below the status card, large tap targets
- **Tablet/Desktop**: Two-column grid for Contact and Aviation side-by-side, status card spans full width

### Implementation Steps

1. **Rewrite MemberDetail.tsx** — Replace the current all-fields-editable form with the new simplified layout: status dashboard card at top, read-only info sections using accordions, and a placeholder services section
2. **Create StatusDashboard component** — Encapsulates the membership status logic (good standing, expiring soon, lapsed) with color-coded visual treatment based on `current_standing` and `expiration_date`
3. **Remove full-record edit mode** — Strip out the Edit/Save/Cancel buttons and editable field infrastructure; keep the data queries intact for display
4. **Add Member Services placeholder section** — A card with role-dependent content (for "member" role, show volunteer toggles like Young Eagle Pilot, VMC Club, etc.) — actual service definitions to be iterated on later

### Technical Notes
- Status computation is pure client-side logic derived from `current_standing` and `expiration_date` columns already in `roster_members`
- No database changes needed
- Admin editing will be revisited separately as targeted edits, not a full-form approach

