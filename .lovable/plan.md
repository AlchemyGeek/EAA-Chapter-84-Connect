## Email List Builder (Officer Service)

A new officer-only page that generates email address lists for common outreach scenarios. Officers pick an audience, see the count and preview, and either copy the list (comma or semicolon) or open it pre-filled as BCC in their mail client.

### Placement
- New Officer Services tile on `/home` titled "Email List Builder" (Mail icon), gated by `isOfficerOrAbove`.
- New route `/officer/email-lists` → `src/pages/EmailListBuilder.tsx`, registered in `src/App.tsx`.
- Standard page shell: top header with Back to Home, chapter logo, 44px tap targets, hairline borders, flat light theme.

### Audiences
Single-select list (radio cards). Source: `roster_members`. Emails are trimmed; blank emails are skipped silently (no skipped-count UI per your choice).

1. **All active members** — `current_standing = 'Active'`
2. **Active — not in good standing (dues overdue)** — `current_standing = 'Active'` AND `expiration_date < today`
3. **Active — in good standing (dues current)** — `current_standing = 'Active'` AND (`expiration_date IS NULL` OR `expiration_date >= today`)
4. **Inactive members** — `current_standing IS DISTINCT FROM 'Active'`
5. **Active, in good standing, who have NOT signed the June 9, 2026 proxy** — audience #3 minus members whose latest `proxy_votes_2026` row has `action = 'signed'`

"Good standing" matches the homepage rule in `MemberHome.tsx` / `ProxyVote.tsx`: `current_standing = 'Active'` AND expiration date not past. (Members within 60 days still count as in good standing, consistent with current app behavior.)

### Output UI
For the selected audience:
- Count badge: e.g. "142 recipients (3 skipped — no email)".
- Tabs/toggle: **Comma-separated** | **Semicolon-separated (Outlook)**.
- Read-only textarea showing the joined list.
- Buttons (44px min):
  - **Copy** — copies the currently shown format; toast confirms.
  - **Open in mail client (BCC)** — `mailto:?bcc=<list>` using semicolons (broadest client support). If the list exceeds ~1800 chars (mailto URL limits), disable the button with a tooltip "List too long for mailto — use Copy instead."
- Names are not included, only emails. De-duplicated case-insensitively.

### Data access
Officer-only access enforced both client-side (`useAuth().isOfficerOrAbove` + redirect) and server-side via a new `SECURITY DEFINER` RPC `officer_email_audience(_audience text)` returning `setof text` (distinct, lowercased emails). The RPC checks `has_role(auth.uid(),'admin') OR is_officer(auth.jwt()->>'email')` and raises on failure. This avoids relying on `roster_members` RLS for bulk reads and keeps the proxy-vote join server-side.

### Technical details
- New file: `src/pages/EmailListBuilder.tsx` — React Query for the RPC keyed by audience, `staleTime: 0`.
- New tile in `src/pages/MemberHome.tsx` Officer Services section.
- New route in `src/App.tsx` wrapped in officer guard (mirror existing officer routes like `MembershipBadges`).
- New migration: create `public.officer_email_audience(text)` SECURITY DEFINER function with `search_path = public`; grant EXECUTE to `authenticated`.
- No new tables, no schema changes to existing tables.

### Out of scope
- Sending email from the app (officers send from their own client).
- Saving/sharing custom audiences.
- Filtering by member_type, leadership role, or volunteering tags (can be added later).
