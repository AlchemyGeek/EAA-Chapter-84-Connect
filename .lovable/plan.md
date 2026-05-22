
# Classifieds — Pass 1 (Browse Experience)

Implements the listings list and detail pages using mock/seed data. No authoring, moderation backend, or DB schema in this pass.

## Routes

- `/classifieds` → `Classifieds.tsx` (list, default Active tab)
- `/classifieds/:id` → `ClassifiedDetail.tsx` (detail)

Both wrapped in the existing `AppLayout` shell so nav/header match the rest of the app. Add a "Classifieds" entry to the member menu on `MemberHome` so members can reach it.

## File structure

```text
src/
  pages/
    Classifieds.tsx
    ClassifiedDetail.tsx
  components/classifieds/
    DisclaimerBar.tsx          // banner + modal trigger
    DisclaimerModal.tsx        // full disclaimer modal
    DisclaimerCallout.tsx      // inline subdued block (detail page)
    ClassifiedFilters.tsx      // search, category, tags, clear; mobile drawer
    ClassifiedCard.tsx         // card used in list grid
    ClassifiedTabs.tsx         // Active / Archived / My Listings
    CategoryBadge.tsx          // colored pill per category
    TagBadges.tsx              // gray pills with +N overflow
    ContactCard.tsx            // right-column contact block
    PhotoGallery.tsx           // primary + thumbnail strip
    OfficerToolbar.tsx         // edit / delete / hide-unhide (UI only this pass)
    RenewDialog.tsx            // 1/2/3 month duration picker (UI only)
    EmptyState.tsx             // shared empty-state block
  lib/classifieds/
    mockData.ts                // seed listings (mix of categories, tags, statuses, photos)
    types.ts                   // Listing type, Category, Tag enums, helpers
    filters.ts                 // pure filter/search functions
```

All colors via existing semantic tokens in `index.css` / `tailwind.config.ts`. Category badge colors added as new HSL tokens (e.g. `--category-for-sale`, `--category-wanted`, …) so they theme correctly. Hairline borders, no drop shadows (per project memory).

## Data shape (mock)

```ts
type Category =
  | "for-sale" | "wanted" | "hangar-space" | "services"
  | "training" | "expertise-help" | "free-giveaway" | "miscellaneous";

type Tag =
  | "aircraft" | "engine" | "avionics" | "kit-build" | "tools"
  | "young-eagles" | "fabric-covering" | "sheet-metal" | "welding" | "books-manuals";

type ListingStatus = "active" | "expired" | "hidden";

interface Listing {
  id: string;
  title: string;
  description: string;
  category: Category;
  tags: Tag[];
  photos: string[];           // empty if none
  status: ListingStatus;
  authorId: string;           // member key_id as string
  authorName: string;
  authorEmail: string;
  authorPhone: string | null;
  authorPhoneVisible: boolean;
  postedAt: string;           // ISO
  expiresAt: string;          // ISO
}
```

Author/officer detection reuses `useAuth()` (`role`, `isOfficerOrAbove`). Current member's `key_id` is read via the existing roster lookup pattern used elsewhere in the app.

## Page 1 — `/classifieds`

1. H1 "Classifieds"
2. `<DisclaimerBar />` — muted text, link triggers `<DisclaimerModal />`
3. `<ClassifiedTabs />` — Active (default) · Archived · My Listings (state in URL `?tab=`)
4. `<ClassifiedFilters />` — search input, Category single-select, Tags multi-select, "Clear filters" link only when any filter is active. On mobile (`useIsMobile`), Category + Tags collapse into a "Filters" button opening a bottom `Sheet`.
5. Grid: `grid-cols-1 md:grid-cols-2 gap-4` of `<ClassifiedCard />`.

Card: thumbnail (only if photos), title, `<CategoryBadge />`, up to 3 tag pills with "+N more", posted-by, "X days ago", "Expires in N days" or "Expired" (destructive token), "View listing" → `/classifieds/:id`. "Your listing" muted badge if `authorId === currentKeyId`. "Hidden" badge only for officers/admins; hidden listings filtered out for everyone else.

Tab logic:
- **Active** — `status === "active"` (hidden filtered out for non-officers)
- **Archived** — `status === "expired"`; show "Renew" on own cards
- **My Listings** — `authorId === currentKeyId`, both active+expired, show Edit/Delete/Renew (UI only)

Empty states per spec. The "Post a Classified" button on empty states is rendered as **disabled with a "Coming soon" tooltip** (not yet wired up this pass).

## Page 2 — `/classifieds/:id`

- "← Back to Classifieds" link
- Desktop: `lg:grid-cols-3`, content `col-span-2`, contact `col-span-1`. Mobile: stacked, contact below.

Left column:
- Title (h1)
- CategoryBadge + tag pills
- `<PhotoGallery />` only when `photos.length > 0` (primary + up to 4 thumbnails; click swaps primary)
- Description
- Meta row: posted-by · posted date · expires date (muted)
- `<DisclaimerCallout />` — inline subdued block with full disclaimer text

Right column `<ContactCard />`:
- "Contact seller"
- Member name
- Email as `mailto:`
- Phone shown only if `authorPhoneVisible && authorPhone`; otherwise omitted entirely

**Expired:** top-of-page warning banner; if author, prominent "Renew listing" → `<RenewDialog />` (1/2/3 months; updates mock state with `expiresAt = now + N months`). Listing remains readable.

**Officer/Admin** (`isOfficerOrAbove`): `<OfficerToolbar />` with Edit, Delete (confirm via `AlertDialog`), Hide/Unhide toggle. Edit is disabled with "Coming soon" tooltip; Delete and Hide/Unhide mutate the in-memory mock store this pass.

## State management

In-memory mock store via a `ClassifiedsProvider` context mounted around the two routes, so Hide/Unhide/Renew/Delete reflect across list and detail without a backend. Filtering done client-side in `lib/classifieds/filters.ts` — pure functions, easy to unit-test later. No persistence across reloads in pass 1.

## Reused primitives

shadcn `Card`, `Badge`, `Button`, `Input`, `Select`, `Tabs`, `Sheet`, `Dialog`, `AlertDialog`, `Popover`, `Tooltip`. 44px min tap targets, 16px min text.

## Out of scope (deferred)

Post/Edit forms, moderation queue, reminder emails, listing caps, payments, real DB schema/RLS, image uploads, mailing.
