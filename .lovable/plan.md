# Member Qualifications — structured Ratings

## What members and officers will see
- **My Profile edit:** the free-text Ratings box becomes a picker with five sections: Certificate (pick one), Category/Class, Instrument, Instructor, Mechanic. Below them is an "Other" box for anything else, like Tailwheel or High Performance.
- **Officer/admin member editing:** the same picker.
- **Directory and member profile:** Ratings show as small chips instead of plain text.
- **Directory search:** a "Qualifications" toggle next to the search box opens the list of chips. Tapping one (for example "CFII") puts that word in the search box and runs the search. Searching "CFI" also finds CFII holders, which is intended.

## Data conversion
- The 24 members in spec section 3.2 get their new Ratings values exactly as listed. The other 228 stay empty.
- You will enter the same 24 values in the EAA Roster Tool. Until you do, the next roster import will bring the old text back. The picker handles old text safely and shows it under "Other".

## Version
- Bump to the next version, v26.11.05.

## Technical details
- New shared module `src/lib/qualifications.ts`: the taxonomy plus `serialize()` and `parse()`. Fixed category order, no duplicates, exact token matching, and any unmatched segments go to Other in their original order. Unit tests cover the spec example round-trip, ordering, dedupe, unknown text going to Other, and an empty value.
- `QualificationsPicker` component used in the MemberHome profile editor and the officer edit form. It still writes the single `ratings` text column through the existing save paths (`member_update_own_record` and the officer update). No database schema change.
- `RatingChips` component used in Members.tsx, MemberProfile.tsx and MemberDetail.tsx.
- The search assist toggle in Members.tsx sets the existing `search` state.
- Data update: 24 UPDATEs on `roster_members.ratings`, matched by key_id after looking up each name. Verify the lookup returns exactly 24 matches before writing.
- Add an AGENTS.md rule: Ratings serialization lives in one shared module so the picker, chips and search use the same tokens.
