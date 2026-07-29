## Goal

Prevent aviation quotes from being visibly clipped in the Squawk banner, without changing the fixed 130px tile height.

## Approach

Two-part fix, both scoped to quotes only:

**1. Auto-shrink medium-long quotes** (in `src/components/squawk/SquawkSlide.tsx`)
- When `slide.kind === "quote"`, measure the combined character length of title (the quote) + body (the author).
- Three tiers:
  - Short (≤ ~110 chars total): current sizing — `text-sm sm:text-base` title, `line-clamp-2`.
  - Medium (~111–180 chars): drop title to `text-xs sm:text-sm`, tighten leading (`leading-snug`), allow `line-clamp-3` on the title, keep author at `text-[11px]`.
  - Long (> 180 chars): filtered out at the source (see #2), never rendered.
- Non-quote tiles keep their current styling untouched.

**2. Filter unfittable quotes from the pool** (in `src/lib/squawk/quotes.ts` + `src/lib/squawk/build.ts`)
- Add a `MAX_QUOTE_LENGTH = 180` constant (quote text + author, incl. quote marks and dash).
- In `build.ts` `quoteSlide()` / the quote selection step, only draw from quotes whose rendered length is within the cap. If the pool of eligible quotes is empty (edge case), fall back to the shortest available quote so the slot never breaks.
- No data migration; quotes stay in the file, just aren't selected when too long.

## Files touched

- `src/components/squawk/SquawkSlide.tsx` — tiered sizing for `kind === "quote"`.
- `src/lib/squawk/build.ts` — filter the quote candidate list by length before random pick.

No schema changes. No changes to non-quote tiles or carousel timing.

## Out of scope

- Modal / click-to-expand for quotes.
- Variable tile height.
- Marquee scrolling.
- Extended dwell time for long quotes.