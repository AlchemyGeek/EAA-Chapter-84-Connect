Center the Members directory page to match the app's central-frame layout pattern.

## What we will change
- Update `src/pages/Members.tsx` so its content lives inside a centered `max-w-3xl` container with `px-4 py-6` (same as Hangar Talk, Briefing Room, etc.).
- Remove the full-width `p-4 md:p-6` wrapper so the page no longer stretches edge-to-edge on large screens.
- Preserve the existing header, search bar, filter switch, table, and mobile cards; no functional changes.

## Why
- The rest of the member-facing pages (Hangar Talk, Briefing Room, etc.) use a centered narrow frame. The directory currently spans the whole viewport, making the experience feel inconsistent.

## Verification
- Preview the `/members` route in desktop and mobile viewports to confirm the content is centered with consistent side margins and the table/cards still render correctly.
