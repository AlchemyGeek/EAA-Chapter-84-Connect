

# New Member Applications — Officer Services Page

## Overview

Add a new "New Member Applications" page under Officer Services that lets officers review, verify, and promote prospect members to regular members.

## Database Changes

**Add columns to `new_member_applications`:**
- `eaa_verified` (boolean, default false) — EAA National membership confirmed
- `fees_verified` (boolean, default false) — fees paid confirmed  
- `processed` (boolean, default false) — set to true once the prospect is promoted to Regular
- `processed_at` (timestamptz, nullable)
- `roster_key_id` (integer, nullable) — link back to the roster member created by the trigger

**Update the trigger** `create_prospect_from_application` to store the generated `key_id` back into `NEW.roster_key_id` by using a RETURNING clause (or updating the application row after insert).

**RLS**: Existing policies already allow officers/admins to view and update applications via the admin policies. We need to add an UPDATE policy for officers (chapter_leadership members).

## New Page: `src/pages/NewMemberApplications.tsx`

**List view:**
- Table with columns: Name, EAA Number, Applied Date, EAA National (checkbox), Fees (checkbox), Sync Status badge, Status
- **Sync badge**: Compare each application's `created_at` against the `lastSyncedAt` value from `localStorage`. Show "Synced" (green) or "Not Synced" (amber) per row
- **Status filter**: Toggle between "All", "Pending", and "Completed" (default: Pending)
- Clicking a row opens a detail view (dialog or inline expansion) showing all application fields

**Detail view (dialog):**
- All submitted fields: name, EAA number, email, address, city, state, zip, quarter applied, fee amount, applied date

**Checkbox behavior:**
- Officers can toggle "EAA National" and "Fees" checkboxes for unprocessed applications
- When both are checked, show a confirmation dialog: "Promote this prospect to Regular member?"
- On confirm:
  - Update `roster_members` for the matching `key_id`: set `member_type = 'Regular'`, `expiration_date` = 2nd Tuesday of January next year
  - Mark the application as `processed = true`, `processed_at = now()`
- Once processed, checkboxes become read-only (disabled)

**Expiration date calculation:**
- Find the 2nd Tuesday of January of the following year
- Logic: start at Jan 1 of next year, find first Tuesday, add 7 days

## Routing & Navigation

- Add route `/new-member-applications` inside the `AppLayout` wrapper
- Add link in MemberHome Officer Services section with a `UserPlus` icon: "New Member Applications"

## File Changes Summary

| File | Change |
|------|--------|
| Migration SQL | Add columns to `new_member_applications`, update trigger, add officer UPDATE policy |
| `src/pages/NewMemberApplications.tsx` | New page with list, detail dialog, checkboxes, promotion flow |
| `src/pages/MemberHome.tsx` | Add link to Officer Services section |
| `src/App.tsx` | Add route |

