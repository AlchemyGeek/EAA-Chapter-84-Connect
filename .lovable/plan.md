# Student Membership

## What members and officers will see

**Join page (/join)**
- New "Membership Type" choice at the top of step 1: Regular Member (selected by default) or Student Member.
- Choosing Student shows the EAA National Student Membership callout, with the link from the spec, and adds a Date of Birth field.
- Applicants aged 19 or older can't submit as a Student and see: "Student Membership is for applicants under 19. Please apply as a Regular Member instead." Switching back to Regular clears the message.
- Step 2 shows a flat $5 using the `student-new-member` fee and its Square link, with no quarterly pro-rating. If that fee is missing, it shows the existing "Fee information is not yet available…" message.
- Nothing changes on the Regular path.

**Officers: New Member Applications**
- Student applications show a "Student" label and the applicant's date of birth.
- Completing a student application sets the member type to "Student" instead of "Regular", and saves the date of birth on the member record.

**Everyone: Student label**
- After an application is completed, a "Student" label appears on the member's directory profile and in the directory list. All members can see it.
- Date of birth stays visible to officers and admins only.

**Renewal inside Connect**
- The Renew button picks the fee from the member's type:
  - Student under 19: `student-renewal`, $5.
  - Student who has turned 19: the $20 Annual Membership Fee, with a short note that they now renew as a Regular member.
  - Everyone else: the $20 link, same as today.
- Renewal timing (from December 1) and the lifetime and paid-ahead exemptions stay the same.

**Not included:** the public "Pay My Dues" page on eaa84.org. That page lives on the chapter website, and the companion spec covers it.

## Fees
Both student fees already exist in Website Configuration → Fees at $5. They currently share one Square link, which is fine unless you want separate pages.

## Technical details
- Add a nullable `membership_type` column (default 'regular') and a nullable `date_of_birth` column to `new_member_applications`. Anonymous inserts keep working under the existing rules.
- Applicant age check lives in a shared helper with tests: under 19 is OK, the 19th birthday blocks, and the same helper decides the student or regular renewal fee.
- The application completion updates set `member_type = 'Student'` and `birth_date` for student applications. Prospect creation stays unchanged. An EAA Roster Tool import still overwrites these fields, because the roster is authoritative.
- Fee lookup is by name (`student-new-member` / `student-renewal`), replacing the hard-coded regular dues link in the renewal flow.
- The directory label reads `member_type` from the existing directory data. Date of birth is never added to directory queries, so it stays officer-only.
- Bump the version to v26.11.03.
