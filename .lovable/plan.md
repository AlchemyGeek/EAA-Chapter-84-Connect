## What's going on

Two different caches can produce the symptom "I don't see my changes until I refresh":

**1. Data cache (React Query) — likely the bigger culprit**

In `src/App.tsx` the global config is:

```ts
staleTime: 5 * 60 * 1000,   // 5 minutes
refetchOnWindowFocus: false,
```

This means: after any page loads data, that data is considered fresh for 5 minutes. If the user edits something on page A and navigates back to page B, page B will happily show its cached 5‑minute‑old copy and never refetch — and because `refetchOnWindowFocus` is off, returning to the tab doesn't help either.

A handful of pages override this with `staleTime: 0` (EmailListBuilder, ProxyVote, NewMemberApplications, MemberHome, BuddyProgram, MemberEngagement, parts of classifieds). Everything else inherits the 5‑minute window — including Members directory, MemberDetail, MemberProfile, MembershipStatistics, Volunteering, Newsletters, Import pages, admin screens, etc.

**2. App shell cache (PWA service worker)**

`vite.config.ts` uses `vite-plugin-pwa` with `registerType: "autoUpdate"`, `skipWaiting: true`, `clientsClaim: true`, and `PWAUpdatePrompt` polls every 10 minutes plus on focus/visibility/route change. This part is fine for most users, but on iOS standalone installs (Add to Home Screen) the "Update available" toast can be missed and the user stays on yesterday's bundle. There's no manual "Check for updates" affordance for users who suspect they're stuck.

## Proposed fix

**A. Make data refresh on focus/return — the real win for most reports**

Change the global React Query defaults in `src/App.tsx` to:

```ts
defaultOptions: {
  queries: {
    staleTime: 30 * 1000,           // 30s instead of 5min
    refetchOnWindowFocus: true,     // refetch when user comes back to tab
    refetchOnReconnect: true,       // refetch after network blip
    refetchOnMount: true,           // default, but explicit
  },
},
```

Rationale:
- A 30‑second window still de‑duplicates back-to-back fetches during a single interaction (won't hammer the API).
- `refetchOnWindowFocus: true` is the single biggest fix: every time the user comes back to the tab/page, lists and detail screens silently refresh.
- Pages that already set `staleTime: 0` keep their stricter behavior unchanged.

**B. Invalidate after mutations consistently**

Spot-check the mutation sites for the pages users complain about (Member edit, Volunteering, Classifieds, NewMemberApplications, BuddyProgram) and make sure each `useMutation` calls `queryClient.invalidateQueries({ queryKey: [...] })` for the lists/details it affects. Today the zero‑stale pages mostly work by accident — focus refetch will help, but explicit invalidation is what makes the change appear instantly on the same screen.

**C. Realtime for the highest-churn tables (optional, second pass)**

For tables where multiple officers/admins act on the same data simultaneously (e.g., `new_member_applications`, `buddy_assignments`, `volunteering_*`, `classifieds`), enable Postgres changes and a small `useRealtimeSubscription` hook to invalidate the matching React Query keys. This makes officer dashboards live without polling.

**D. Manual "Check for updates" affordance**

Add a small "Check for updates" button (e.g., in the More panel near version info) that calls the existing `__pwaCheckForUpdate` hook and falls back to `window.location.reload()` if no SW update is found. Gives users a one‑tap escape hatch when they think they're on an old build.

## Out of scope

- No changes to the PWA registration model, manifest, or service worker strategy — the install/update path is sound; this is mainly a React Query tuning + invalidation hygiene problem.
- No global migration of every `useQuery` call site — the global default change covers them automatically.

## Question before I build

Would you like all four parts (A + B + C + D), or should I start with **A + B + D** now and treat realtime (C) as a follow‑up once we see whether focus‑refetch alone resolves the complaints?