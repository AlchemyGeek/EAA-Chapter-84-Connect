# Dues Payment: inactive members in search

## Current state (verified)

- The dues search already loads every roster member (no standing filter), so inactive members are findable today — but the result rows show only name and EAA number, with no indication of standing.
- Recording a payment already flips an inactive member to "Active" in the roster record along with the expiration date and payment note.

## What changes

1. **Mark standing in search results** — each row in the dropdown gets a small badge:
   - "Inactive" (red) when standing is not Active
   - "Overdue" (amber) when Active but the chapter expiration has passed
   - no badge for members in good standing
2. **Exclude prospects** — Prospect-type members no longer appear in the dues search results.
3. **Inline reactivation notice** — when an inactive member is selected, a highlighted note appears above the Record Payment button: recording this payment will reactivate the member and set their standing back to Active.

No change to the payment logic itself — the inactive-to-active transition already happens and stays as is.

## Technical notes

All work is in `src/pages/DuesPayment.tsx` (presentation only):

- Filter `member_type !== "Prospect"` in the `searchResults` memo.
- Compute per-row standing state in the results list (same rules as the existing `isStandingInactive` / `isOverdue` checks) and render a `Badge`.
- Add the notice block in the Payment Details card, gated on the existing `isInactive` value.
