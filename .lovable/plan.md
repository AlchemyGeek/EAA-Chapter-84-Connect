# 2026 Bylaws Proxy Vote Feature

A temporal feature active through **June 8, 2026** with three surfaces:
1. Banner on Member Home
2. New `/proxy-vote` form page
3. Permanent officer results export under Chapter Operations

---

## 1. Database

New table `proxy_votes_2026` to store an audit trail (signs and revocations both preserved).

Columns:
- `key_id` (member roster id)
- `member_name` (snapshot at signing)
- `action` ('signed' | 'revoked')
- `created_at`

Helper function `get_current_proxy_vote(_key_id)` returns the latest action for a member (used to show signed/revoked state).

RLS:
- Members can `INSERT` rows where `key_id` matches their own roster record.
- Members can `SELECT` their own rows.
- Officers and admins can `SELECT` all rows (for export).
- No `UPDATE` or `DELETE` (audit integrity).

A view `proxy_votes_2026_summary` (or client-side aggregation) gives officers one row per member with: latest status, first signed timestamp, latest revoked timestamp.

## 2. Member Homepage Banner (`src/pages/MemberHome.tsx`)

Inserted between Member Photos and Member Services sections.

Render conditions (ALL must be true):
- Today < `2026-06-09`
- Viewer is an active member (existing `isRestricted === false` check)

Visual:
- Amber/gold background card (`bg-amber-50 dark:bg-amber-950/30`, `border-amber-300`)
- 📋 icon left
- Headline: "EAA Chapter 84 — Changes to Bylaws: Voting Proxy Form"
- Subtext explaining the proxy
- Small muted line: "Proxy form available through June 8, 2026."
- Primary CTA `Open Proxy Form →` linking to `/proxy-vote`

If the member has already signed, show a small inline confirmation chip ("✅ Proxy signed") inside the same banner; CTA changes to "View / Manage Proxy".

## 3. Proxy Vote Page — `/proxy-vote`

New file `src/pages/ProxyVote.tsx`, registered in `src/App.tsx`. Uses the standard authenticated mobile-first layout (matches existing pages like DuesPayment).

Access gates (in order):
1. Not authenticated → redirect to `/auth`
2. Authenticated but not active member → message: "This form is available to active EAA Chapter 84 members only."
3. Today > 2026-06-08 → message: "The proxy voting period has closed. Thank you to all members who participated."
4. Otherwise → render the form

### Form card (document-style)
White card, hairline border, generous padding, centered title:
**"EAA CHAPTER 84 VOTING PROXY FORM (Washington Nonprofit)"**

Fields rendered as labeled rows. Pre-filled values appear in a lightly shaded read-only box using a monospace font.

| Label | Value | Font |
|---|---|---|
| I, ___ (Member Name) | Authenticated member's full name | mono |
| appoint ___ (Proxy Name) | Michael Zyskowski | mono |
| Organization | EAA Chapter 84 | mono |
| Meeting Date | 06/09/2026 | mono |

Italic block between fields:

> **Limited Proxy** — My proxy may vote only as follows: To vote on changing of the EAA Chapter 84 Bylaws.
>
> This proxy is valid for this meeting and any adjournment unless revoked by me.

Then:
- Member Signature (handwriting font — Dancing Script via Google Fonts) showing the member's name once signed
- Date — today's date in MM/DD/YYYY, monospace, filled when signed

### States
- **Unsigned**: Show button `✍️ Click Here to Sign Proxy`. On click → insert row `action='signed'`. No extra confirmation dialog (the click itself is the affirmative action).
- **Signed**: Replace button with green confirmation banner: `✅ Your proxy vote has been recorded on [MM/DD/YYYY] at [HH:MM AM/PM].` Below the form add an outlined destructive `Revoke My Proxy Vote` button.
- **Revoke action**: AlertDialog confirms intent. On confirm → insert `action='revoked'` row. Show neutral banner: `Your proxy vote has been revoked as of [...]. You may re-sign if the voting period is still open.` Sign button reappears.

Audit trail preserved — never deletes rows.

## 4. Officer Export — Chapter Operations

In MemberHome's Officer Services / Chapter Operations subsection, add an entry:
`📊 2026 Bylaws Proxy Vote Results` (always visible, no expiration).

Implementation: a small handler component (or inline button styled like `AdminLink`) that, on click:
1. Queries `proxy_votes_2026` for all members, ordered by member then created_at.
2. Aggregates per `key_id`: latest action, first 'signed' timestamp, latest 'revoked' timestamp (if status=revoked).
3. Generates `.xlsx` via existing `xlsx` package (already used in `src/lib/export.ts`).
4. Filename: `EAA84_ProxyVote_Results_YYYY-MM-DD.xlsx`

Columns:
- Member Name
- Member ID (key_id)
- Date Signed (MM/DD/YYYY)
- Time Signed (HH:MM AM/PM local)
- Status (Signed | Revoked)
- Date Revoked (blank if not revoked)
- Time Revoked (blank if not revoked)

Only members with at least one row are included.

## 5. Files Touched

- New: `supabase` migration for `proxy_votes_2026` + RLS
- New: `src/pages/ProxyVote.tsx`
- New: `src/lib/exportProxyVotes.ts` (xlsx export helper)
- Edit: `src/App.tsx` (register `/proxy-vote` route)
- Edit: `src/pages/MemberHome.tsx` (banner + officer export link)
- Edit: `index.html` or a CSS import for Dancing Script Google Font

## Technical Notes

- Cutoff date constant `PROXY_DEADLINE = new Date('2026-06-09T00:00:00')` in a shared constant file; banner and form gate on this.
- Member full name = `nickname || first_name + ' ' + last_name` (matches existing patterns).
- Use `useQuery` with `staleTime: 0` for the member's current proxy state so signing/revoking reflects immediately.
- Officer export uses `useMutation` to fetch on demand (no cached query).
