# Briefing Room — v1

A running archive of general aviation and homebuilding news inside Connect, filled by the Claude agent over MCP, reviewed by officers, and readable by all active members. Public RSS feed included.

## Member experience

**Front Page** (`/briefing-room`)
- Newspaper-masthead nameplate: "EAA Chapter 84 — Briefing Room", flat light styling with hairline borders, no shadows (matches app style).
- One lead item shown large (most recent published), remaining recent items in a compact list below.
- Each item: headline, short summary, source name, category chip, publish date.
- Tapping an item expands the full summary and gives a clear link out to the original article (opens in a new tab).
- Persistent toggle to switch to Archive.

**Archive / Search** (`/briefing-room/archive`)
- Flat list of every published item, newest first, infinite scroll / "Load more".
- Keyword search across headline + summary.
- Filters: category (Homebuilding, Safety & Regulatory, Industry News, Events & Airshows, EAA), source, date range.
- Nothing ever expires from this view.

**Entry into the app**
- New "Briefing Room" tile on the Member Home menu with a "New" badge, and a count of items added in the last 7 days.
- Access gated the same way as Hangar Talk / Classifieds: active members only.

## Officer approval queue

`/briefing-room/review`, visible only to officers.
- Lists all items with status "pending review", newest first, with a pending count badge on the Officer Services card.
- Per item: Approve (publish), Edit (headline / summary / category / source name), Reject (discarded, hidden everywhere).
- Officers can also edit already-published items in place, and unpublish to "archived" if a story is retracted.
- Any officer edit sets an internal "edited" flag plus who edited and when; shown in the queue, not to members.

## Agent integration (MCP)

Four new tools added to the existing Connect MCP server, so the agent connects through the same OAuth flow and acts as a real account:
- `search_news_items` — search by keyword, source, category, date range.
- `check_duplicate` — given URL + headline, reports whether a matching or near-matching item already exists in the recent archive (exact URL match, plus normalized-headline similarity).
- `create_news_item` — creates an item; Connect sets the status from the current publish mode (pending review in v1).
- `list_recent_by_source` — recent items for a given source, so the agent can pace itself.

Write access is restricted to officers, so the agent must be connected as a designated officer account. Read tools stay open to active members.

## RSS feed

Public edge function at `/functions/v1/briefing-room-feed` returning RSS 2.0 XML, no auth required. Published items only, newest first, capped at the most recent 50. Each item carries title, link (source URL), description (summary), pubDate, category, and a stable guid. Updates automatically as officers approve items.

## Technical notes

- New table `briefing_room_items`: headline, summary, source_name, source_url (unique), source_published_at, added_at, category (enum), status (pending_review / published / rejected / archived), edited flag, edited_by, edited_at, created_by.
- RLS: active members read published items; officers read and write everything; the RSS function reads published items with the service role. Explicit GRANTs for `authenticated` and `service_role`; no `anon` grant (the feed goes through the function).
- Full-text search index (tsvector over headline + summary), same approach as the newsletter archive, plus indexes on status, category, and date.
- An "auto-publish" flag lives in site config, defaulted off, so flipping it later needs no code change to the MCP contract.
- MCP manifest regenerated and the `mcp` function redeployed after the new tools are added.
- Version string bumped and reflected in the UI.

## Not in v1

Featured/notable flagging (front page always leads with the most recent), YouTube/video items, and auto-publish being turned on.
