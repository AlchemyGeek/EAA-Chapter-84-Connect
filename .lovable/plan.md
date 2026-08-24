# Archive Incomplete New Member Applications

Officers get a way to close out applicants who never finished their application: the roster record becomes Inactive (still a Prospect) and the application moves into a new "Incomplete" category.

## What officers will see

- In the application detail dialog (the same one with Payment Reminder / Application Completed), a new **Archive as Incomplete** action with a confirmation step. Available only while the application is not processed.
- Archiving:
  - Sets the linked roster record's standing to **Inactive** (member type stays **Prospect**).
  - Stamps the application as archived, so it disappears from **Pending**.
- A new **Incomplete** option in the filter dropdown lists archived applications; they also appear under **All** with an "Incomplete" badge.
- Archived applications show who archived them and when, plus a **Restore** action that clears the archive and sets the roster standing back to Active.

## Export behavior

No new export work is needed: the Export page compares the live roster against the last import snapshot, so the standing change from Active to Inactive shows up automatically as a "modified" change on the next export, ready to enter into the EAA Roster Tool.

## Technical notes

- Migration on `public.new_member_applications`: add `archived_at timestamptz`, `archived_by uuid` (references `auth.users`, ON DELETE SET NULL), `archived_by_name text`. No new table, so existing grants/policies stay as they are.
- `src/pages/NewMemberApplications.tsx`:
  - Filter state gains `"incomplete"`; queries become `processed=false AND archived_at IS NULL` for Pending, `archived_at IS NOT NULL` for Incomplete, `processed=true` for Completed.
  - New `archiveApplication` / `restoreApplication` mutations. Each resolves the roster row the same way `recordFeePayment` does (`roster_key_id` first, EAA# fallback), updates `roster_members.current_standing` to `Inactive` / `Active`, then writes the archive fields on the application. Both invalidate `new-member-applications` and the roster queries.
  - Badge + detail-dialog rows for the archived state; reminder/welcome buttons disabled while archived.
