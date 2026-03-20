

## Passwordless Auth: OTP Sign-In + Password-Free Sign-Up

### Overview
Replace password-based authentication with email OTP codes. Both sign-in and sign-up will be passwordless.

### Changes

**1. Update Auth modes and state (`src/pages/Auth.tsx`)**
- Change `AuthMode` to: `"signin" | "signin-otp" | "signup" | "signup-otp"`
- Remove the `password` state variable entirely
- Add `otp` state for the 6-digit code
- Remove the "forgot password" mode (no longer needed with passwordless)

**2. Sign-in flow (two steps)**
- Step 1 ("signin"): User enters email, clicks "Send Code". Calls `supabase.auth.signInWithOtp({ email })`. Transitions to "signin-otp".
- Step 2 ("signin-otp"): User enters 6-digit code via InputOTP component. Calls `supabase.auth.verifyOtp({ email, token: otp, type: 'email' })`. On success, navigate to `/home`.

**3. Sign-up flow (two steps)**
- Step 1 ("signup"): User enters email + EAA number. Roster validation runs as today. If valid, calls `supabase.auth.signInWithOtp({ email })` (this creates the account if it doesn't exist). Transitions to "signup-otp".
- Step 2 ("signup-otp"): Same OTP verification as sign-in. On success, navigate to `/home`.

**4. UI updates**
- Remove all password input fields
- Remove "Forgot your password?" link
- Add InputOTP component (already exists in the project) for the code entry steps
- Show "Check your email for a 6-digit code" message on OTP steps
- Add "Resend code" button on OTP steps
- Add "Back" button to return to email entry

**5. Cleanup**
- Remove or simplify `src/pages/ResetPassword.tsx` route (no longer needed since there are no passwords)
- Remove the `/reset-password` route from `App.tsx`

### Technical Details
- `signInWithOtp({ email })` handles both new and existing users — it sends an OTP and creates the account on first use
- The roster check still happens before sending OTP during sign-up to prevent non-members from creating accounts
- The existing `check_email_and_eaa_in_roster` RPC is reused unchanged
- No database migrations needed
- No edge functions needed

