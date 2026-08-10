# Briefing Room — article images

Let the news agent supply an image with each story and show it on the Briefing Room front page.

## What changes for readers

- Front page lead story: image shown large above the headline.
- Front page recent list: small thumbnail to the left of each headline.
- Items with no image render exactly as today — plain text card, no gap or placeholder.
- Archive pages stay text-only.

## What changes for officers

- The review queue shows the image (small preview) on each item.
- The edit form gains an "Image URL" field; officers can paste a new URL or clear it to remove the image.
- Editing the image counts as an officer edit like any other field.

## Agent (MCP)

- `create_news_item` gains an optional `image_url` input, described as a direct link to a representative image for the story.
- `search_news_items` and the review/list tools return the image URL so the agent can see what already exists.

## RSS

- Published items with an image include it in the feed as an `<enclosure>` plus a `<media:content>` tag, so readers that support images show the thumbnail.

## Technical notes

- Migration: add nullable `image_url text` to `briefing_room_items`. No new grants or policies needed (existing table policies cover it).
- `src/lib/briefingRoom/types.ts`: add `image_url: string | null` to `BriefingItem`; `ItemEdit` in `api.ts` gains `image_url?: string | null` (empty string normalized to null on save).
- `BriefingItemCard.tsx`: render image when present — lead uses a full-width 16:9 rounded image with hairline border; non-lead uses a fixed ~88px square thumbnail alongside the text. `loading="lazy"`, `alt` set to the headline, and `onError` hides the image so a dead link degrades to the text-only layout.
- Only `https:` URLs are accepted (validated in the MCP tool and the officer form); anything else is stored as null/rejected.
- `BriefingRoomReview.tsx`: preview thumbnail plus an Image URL input in the edit block.
- `src/lib/mcp/tools/create-news-item.ts` and `search-news-items.ts` (and `list-recent-by-source.ts`) updated; MCP manifest regenerated and the `mcp` function redeployed.
- `briefing-room-rss/index.ts`: select `image_url`, add `xmlns:media` to the `<rss>` element, and emit enclosure/media tags only for items that have one.
- Version string bumped and updated in the UI.
