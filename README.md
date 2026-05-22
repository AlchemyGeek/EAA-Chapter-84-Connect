# EAA Chapter 84 Connect

A member portal for **Experimental Aircraft Association (EAA) Chapter 84**, built to coordinate the chapter's roster, dues, volunteering, communications, and member services in one place. The app mirrors the authoritative EAA Roster Tool and layers chapter-specific workflows on top of it.

**Live site:** https://eaa84connect.lovable.app

---

## What the site does

EAA 84 Connect is a mobile-first, sidebar-free web app with role-based access for **Admins**, **Officers**, and **Members**. Members sign in passwordlessly with a 6-digit OTP sent to their chapter-registered email.

### Member-facing features

- **Member Home** — personalized hub showing membership status, expiration date, and quick links to chapter services.
- **Member Directory** — searchable list of active members with privacy-respecting contact info and volunteering badges.
- **Member Profile** — view and edit safe self-service fields (nickname, photo, privacy toggles).
- **Dues Payment** — pay annual chapter dues via external payment link, with auto-populated fee schedule.
- **Volunteering Opportunities** — browse and sign up for chapter volunteer activities; track Active/Completed status.
- **Newsletters Archive** — full-text searchable PDF archive of past chapter newsletters.
- **Membership Badges** — delivery tracking for the 2026 pilot badge program.
- **Classifieds** — post, browse, search, and manage member listings (aircraft, parts, services) with photos, categories, and officer moderation.
- **Proxy Vote** — submit proxy votes for chapter elections.
- **New Member Application** (`/join`) — public, 2-step prospect form with pro-rated dues.

### Officer & Admin features

- **Roster Import / Export** — sync against the EAA Roster Tool with mandatory dry-run preview, record-level diffing, and orphan reconciliation.
- **Sync Status & History** — review past imports and lock payment records as needed.
- **New Member Applications Queue** — review and approve pending applicants.
- **Buddy Program** — manually match new members with experienced buddies, with email notifications.
- **Member Engagement** — 12-week activity trends and KPIs based on current standing.
- **Membership Statistics** — chapter-wide stats gated strictly on `current_standing` and `expiration_date`.
- **User Roles** — assign Admin / Officer / Member roles with realtime updates.
- **Site Configuration** — manage links, fees, and roles from a collapsible admin panel.
- **Impersonation** — "View as Member" for support and troubleshooting.
- **Classifieds Moderation** — hide/unhide listings chapter-wide.

### Architecture & security highlights

- React 18 + Vite 5 + TypeScript + Tailwind CSS v3 + shadcn/ui
- Supabase backend (database, auth, storage, edge functions) provisioned via **Lovable Cloud**
- Strict Row-Level Security on every table; `SECURITY DEFINER` helpers prevent recursion
- PWA with hourly update checks (`vite-plugin-pwa`)
- Transactional email via Resend on the `notify.eaa84.org` custom domain
- Flat, light-themed UI: hairline 0.5px borders, no drop shadows, 44px minimum tap targets, WCAG AA contrast

---

## Working on the project in Lovable

This project lives at **https://lovable.dev/projects/c4d96420-8fd3-4279-9bb8-1ab315dc72a1**.

Open the project in Lovable and prompt for changes — edits sync automatically to this repository (and vice-versa, see the GitHub integration below).

> **Note on importing:** Lovable does not currently support importing an existing GitHub repo into a new Lovable project. To work on this codebase in Lovable, open the existing project link above. If you've forked the repo and want a separate Lovable workspace, create a new Lovable project, connect it to your fork via the GitHub integration, then copy the code over.

### GitHub two-way sync

In the Lovable editor: **+ menu → GitHub → Connect project**, authorize the Lovable GitHub App, and pick the destination account/org. After that, pushes to GitHub sync into Lovable in real time, and Lovable edits push commits back automatically.

### Edit locally with your IDE

```bash
git clone <YOUR_GIT_URL>
cd eaa84-connect
npm install
npm run dev
```

You'll need a Supabase project for the backend. The Supabase URL, anon key, and project ID are read from `.env` (auto-managed by Lovable Cloud — do not edit by hand when working inside Lovable).

---

## Self-hosting the app

The frontend is a standard Vite/React SPA and can be hosted on any static host (Vercel, Netlify, Cloudflare Pages, S3 + CloudFront, your own nginx, etc.). The backend runs on Supabase.

### 1. Build the frontend

```bash
npm install
npm run build
```

The production bundle is emitted to `dist/`.

### 2. Provide environment variables

Create a `.env` (or set them in your host's environment) with:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
VITE_SUPABASE_PROJECT_ID=<your-project-ref>
```

### 3. Deploy the static bundle

Upload `dist/` to your host. **Configure SPA fallback** so that all unknown paths serve `index.html` (otherwise deep links like `/classifieds/:id` will 404 on refresh):

- **Netlify**: add `/* /index.html 200` to `public/_redirects`
- **Vercel**: zero config (auto-handles SPA)
- **nginx**: `try_files $uri $uri/ /index.html;`
- **Apache**: standard `RewriteRule` to `index.html`

### 4. Stand up your own Supabase backend

1. Create a Supabase project at https://supabase.com.
2. Run the migrations in `supabase/migrations/` against your new project (via the Supabase CLI: `supabase db push`).
3. Deploy the edge functions in `supabase/functions/` (`supabase functions deploy <name>`).
4. Create the storage buckets referenced by the app (`member-photos`, `classifieds`, `newsletters`, etc.) and apply the RLS policies from the migrations.
5. Configure auth: enable email OTP, disable signups if desired, and set the redirect URLs to your domain.
6. Add any required secrets (Resend API key for email, etc.) under **Project Settings → Edge Functions → Secrets**.

### 5. Custom domain & email

For transactional/auth email from your own domain, configure Resend (or another SMTP provider) and update the `FROM` address in the edge functions. Verify the domain's SPF/DKIM/DMARC records.

For more on self-hosting Lovable projects, see https://docs.lovable.dev/tips-tricks/self-hosting.

---

## Tech stack

- **Frontend:** React 18, Vite 5, TypeScript 5, Tailwind CSS v3, shadcn/ui, React Router, TanStack Query
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions) via Lovable Cloud
- **Email:** Resend on `notify.eaa84.org`
- **PWA:** `vite-plugin-pwa`
- **Hosting:** Lovable (production) — portable to any static host + Supabase

## License

This project is maintained by EAA Chapter 84. Contact the chapter for usage terms.
