# Page Access Stats on the Engagement Page

## What you'll see
A new **Page Access** section on the Member Engagement page, between the weekly chart and the member activity list:
- **Range picker**: 7 days, 30 days, 90 days, All time (30 days selected first).
- **Percentage chart**: one horizontal bar per page showing its share of all page visits in that range. All the bars add up to 100%. Pages are sorted from most visited to least.
- **Counts table**: for each page, the visits, the number of different members who opened it, and its percentage.
- If there are no visits in the range, it says so instead of showing an empty chart.

## How visits are counted
- Each member page is counted on its own. Opening the same page several times in one sitting counts once, the same way visits are counted today.
- Everyone signed in as a member is counted, officers and admins included.
- Pages covered: Member Home, Directory, Member Profile, Resources, Newsletters, Briefing Room, Briefing Room Archive, Volunteering, Hangar Talk, Classifieds, Flyover, Dues Payment. Detail pages count toward their main page, so opening one post counts as Hangar Talk.
- History so far: Directory and Member Profile visits keep their past counts, and Member Home uses the past sign-in counts. Newsletters, Volunteering and both Briefing Room pages were recorded together until now, so they show up as one "Services (combined, before split)" row until those visits age out of the range. Every other page starts counting from the day this goes live.
- The top numbers on the page (active members, highly engaged and so on) stay exactly as they are.

## Technical details
- Add a `page_view:<page>` event type to the existing visit hook (once-per-session dedupe kept), and call it on every page listed above. Keep the existing `login`, `directory_view`, `profile_view` and `service_page` events so the current KPI functions are unchanged.
- New security-definer function `engagement_by_page(_days int)` (null means all time), limited to officers and admins. It returns the page, the visit count and the number of distinct members. Legacy `directory_view`/`profile_view`/`login` events map to their pages, and legacy `service_page` becomes the combined row.
- Page names and their mapping live in one shared module. A small tested helper turns counts into percentages that always add up to exactly 100%.
- Chart built with recharts, the same as the existing trend chart. Flat style, hairline borders.
- Version bump to v26.11.06.
