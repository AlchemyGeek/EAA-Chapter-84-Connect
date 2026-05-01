## Goal

When an officer marks **Fees** as paid for a new member application, open a payment dialog (mirroring the Membership Due Payment service) so they can record the date, amount, and method. On confirm, write the formatted "Payment" string to the prospect's `roster_members.udf1_text`. No `dues_payments` row is created (per Option A).

## UX flow

1. In `NewMemberApplications`, clicking the **Fees** checkbox while it is unchecked no longer toggles directly. It opens a new "Record Membership Payment" dialog.
2. Dialog fields (defaults):
   - Payment Date → today
   - Amount → `application.fee_amount` (already pro-rated by quarter)
   - Method → Square (`sq`), with options: Cash, Check, PayPal, Square (same list as DuesPayment)
3. On **Confirm**:
   - Update `roster_members.udf1_text` for `roster_key_id` with `MM/DD/YYYY $<amount>/<method_code>` (matching DuesPayment format).
   - Update `new_member_applications.fees_verified = true`.
   - Close dialog. If `eaa_verified` was already true, the existing promotion confirmation flow (`setPromoteApp`) fires as it does today.
4. **Unchecking** Fees keeps current behavior (just flips `fees_verified` back to false; does not clear `udf1_text`).

## Technical changes

Single file: `src/pages/NewMemberApplications.tsx`.

- Add `PAYMENT_METHODS` constant (Cash/Check/PayPal/Square with codes `cash`, `check`, `pp`, `sq`) — copied from `DuesPayment.tsx`.
- Add state: `feeDialogApp`, `payDate`, `payAmount`, `payMethod` (default "Square").
- Replace fees `onCheckedChange` handler:
  - If currently unchecked and being checked → open `feeDialogApp` with defaults seeded from `app`.
  - If currently checked and being unchecked → existing `updateVerification.mutate` path.
- New mutation `recordFeePayment` that:
  1. `update roster_members set udf1_text = '<formatted>' where key_id = app.roster_key_id`
  2. `update new_member_applications set fees_verified = true where id = app.id`
  3. On success: invalidate query, close dialog, and if `app.eaa_verified` is true, set `promoteApp` to trigger the existing promotion confirmation.
- New `<Dialog>` block for the fee payment form (Date picker + Amount input + Method Select + Confirm/Cancel), mirroring DuesPayment's input style.

## Out of scope

- No `dues_payments` insert (Option A).
- No changes to the unchecking flow.
- No changes to promotion logic, expiration date, or EAA checkbox.