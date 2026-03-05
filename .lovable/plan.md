

## Retention KPI

**Concept**: Retention rate = members who were active last year and renewed for this year, divided by total members who were active last year. This tells you what percentage of last year's members you kept.

**Data available**: We already have the fields needed on `roster_members`:
- `expiration_date` — members expiring in the current year were active last year but haven't renewed yet; members expiring beyond current year have renewed
- `current_standing` — "Active" vs inactive
- `date_added` — to exclude brand-new members added this year (they aren't "retained", they're new)

**Calculation**:
- **Last year's base** = all members who were active last year. These are members whose `expiration_date >= currentYear` (they were valid through at least end of last year) AND `date_added` is before current year (excludes new members). Also include inactive members whose expiration was in the current year or last year (they lapsed).
- Simpler approach: members whose expiration year ≥ current year AND added before this year = **renewed** (retained). Members whose expiration year = current year AND still active = **yet to renew** (potential retained). Members who are inactive or expired before current year = **lost**.
- **Retained** = `goodStanding` members (expiration > currentYear) minus `newThisYear` 
- **Last year base** = retained + yetToRenew + lapsed members from last year
- **Retention %** = retained / last year base × 100

**Implementation**:
1. Add retention calculation in `MembershipStatistics.tsx` using existing member data — no new queries needed
2. Compute `lastYearBase`: members added before this year whose expiration_date year ≥ last year (they were active last year)
3. Compute `retained`: subset of lastYearBase whose expiration extends beyond current year
4. Add a 5th KPI card showing the retention percentage with a suitable icon and color

This is a pure frontend change — no database migration required.

