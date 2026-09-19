# New Member Survey — Class of 2026

Build the survey from the attached spec as a public page in Chapter 84 Connect, with an officer results view. The spec says "Class of 2025"; we are re-targeting it to members who joined in **2026** (question wording, quarter options, and intro text updated accordingly).

## What members see

- A public link specific to this survey — `eaa84connect.lovable.app/survey-new-members-2026` — that you email to the 2026 class. No sign-in required.
- The survey intro from the spec ("New to the Pattern — tell us how we're doing") with the chapter logo, with the year updated to 2026.
- All 28 questions across the 5 sections, rendered with the right input for each type: pick-one, pick-many (with max limits where the spec sets them), 1–5 scales, one-answer-per-row grids, free text, and the 0–10 recommendation scale.
- Required questions are the ★ core ones; everything else can be skipped.
- Q6 ("Which quarter did you join?") offers the 2026 quarters.
- A thank-you screen after submitting. Submitting again from the same device is gently discouraged with a local note, but nothing blocks it — responses are fully anonymous.

## Anonymity

- Responses are stored with no link to any member account — no email, no member record, nothing. The only identifying data is what someone optionally types into Q28 (name/email for follow-up).
- Because it's fully anonymous and public, we add a hidden honeypot field and a minimum-time-on-form check to filter obvious bot submissions.

## What officers see

- A new "Survey Results" page under Officer Services (admin + officer only):
  - Headline metrics from the spec's analysis plan: onboarding score (avg of Q19 statements), resource satisfaction averages (Q13), renewal intent % (Q24 Definitely/Probably), volunteer pool counts (Q26), NPS-style recommend score (Q25).
  - Per-question breakdowns with counts/charts, cut by primary persona (Q2).
  - The open-ended answers (Q11, Q16, Q21, Q22, Q27) listed for reading and theme-tagging.
  - A "Download CSV / Excel" export of all raw responses for deeper board-deck analysis.

## How you distribute it

- Copy the link and email it to the 2026 members yourself (e.g. via the existing Email List Builder). Nothing is sent automatically.
