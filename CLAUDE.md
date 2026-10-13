# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Clawholics: a nail salon appointment system (booking, Xendit payments, loyalty stamps via QR scan, admin CMS). One Next.js 16 App Router app at the repo root, deployed to Vercel: Clerk auth, Supabase Postgres, Cloudflare R2 images, Resend emails, Tailwind v4.

## Commands

- `npm run dev` — `next dev` on :5174 (needs `.env.local`, see `.env.example`)
- `npm run build` — `next build` (includes the type-check); `npm run lint` — ESLint (`eslint-config-next`)
- `npm test` — Vitest (jsdom, `@` alias → `src/`); one pass: `npm test -- --run`; single file: `npx vitest run src/tests/contactUs.test.tsx`
- `npm run test:db` — Postgres integration tests in `src/tests/db` against a throwaway Docker Postgres
- `npm run db:export -- <dir>` — read-only export of the live D1 to JSON (wrangler login, root `wrangler.toml`); `npm run db:copy -- <dir> [--replace]` loads it into `DATABASE_URL` in one transaction (creates the schema if missing, refuses a non-empty target without `--replace`). Keep export folders outside the repo: they hold customer data.

## Architecture

### Legacy Worker (still live until cutover)
Production data is still in Cloudflare D1, served by the Worker `clawholics-api-staging` (https://clawholicsbymax.com). Its source (`worker-api/`), the Express `backend/` and the Vite `frontend/` were removed from the repo; see git history before the move to a single app. `wrangler.toml` is kept only for the D1/R2 bindings that `db:export` uses, so `wrangler deploy` no longer works from here. The live D1 has only its baseline migration; `copy-from-d1.mjs` backfills what D1 migrations 001–004 would add (categories, service position and pricing mode, contact fields, payment settings).

### App structure
The app was ported from a Vite SPA (`frontend/`, now removed), which is why the screens use a react-router-style API.
- `src/app/` holds only thin route files. `(site)/` routes render a screen from `src/views/` (the old `src/pages/`, renamed because Next reserves `pages/`) inside `SiteLayout`, with `OnboardingGate` where `App.tsx` had it. `(admin)/` routes are the admin screens (kebab-case URLs such as `/client-directory`; the old `/AS_*` URLs redirect in `next.config.ts`; screens in `src/admin/`; `/admin` is the entry point and sends an admin to `/dashboard`, the admin landing page (business metrics from `GET /api/dashboard`, computed in `src/server/dashboard.ts`; the periods are in `src/lib/dashboardPeriods.ts`; the wins / watch-outs / suggestions banner is rule-based, in `src/lib/dashboardInsights.ts`); `/sales` and `/performance` show the rest of the same numbers (money cards, sales record; key rates, artist utilization), all three framed by `src/admin/ReportPage.tsx`; its Money row is worked out from list prices and downpayments only: balance paid at the salon, confirmed visits booked ahead, and what cancellations cost; the admin layout is `noindex` and `src/app/robots.ts` disallows the admin paths). On phones the admin has a bottom tab bar (`components/admin/AdminTabBar.tsx`, rendered by `SideBar`; the routes are in `adminNav.ts`), and the four daily screens (Appointments, Schedule, Scanner, Clients) use `AdminShell` and show phone layouts below `lg`; from `lg` up the sidebar and the old layouts apply, and `(admin)/layout.tsx` checks on the server that the Clerk user has `publicMetadata.role === "admin"` (replaces `AdminRoute`). `src/proxy.ts` is Next 16's middleware and only runs `clerkMiddleware`.
- Screens and admin components are client components (`"use client"`), but they are still rendered on the server first, so `window`/`document`/DOMPurify can't run during render: use effects or `hooks/useIsClient`.
- `src/lib/router.tsx` re-creates the react-router API the screens use (`Link`, `useNavigate`, `useLocation`, `useParams`, `useSearchParams`, `Navigate`) on `next/navigation`. Router `state` is kept in sessionStorage per target path (cleared on a fresh page load, kept on reload) and is null during server render/hydration, so screens that need it on first render (booking, payment, reschedule, profile) are wrapped in `components/guards/ClientOnly` in their `page.tsx`. Screens using `useSearchParams` need a `<Suspense>` there too.
- With `NEXT_PUBLIC_API_BASE_URL=/api`, the browser stays same-origin. `/api` paths with a route file under `src/app/api/` are answered by Next; every other `/api` path reaches `API_PROXY_TARGET` (the live Worker) through the `fallback` rewrite in `next.config.ts`, so Vercel previews need no Worker CORS change.
- SVGs import as React components via `@svgr/webpack`; static image imports are `StaticImageData`, so use `.src`.

### API on Supabase (migration: Phase 3 cutover pending)
The Worker's endpoints are ported to route handlers in `src/app/api/` on Supabase Postgres. Until the Phase 3 data cutover the live data stays in D1, so the Worker remains the source of truth:
- **`API_BACKEND` switch:** ported handlers are wrapped in `ported()` (`src/server/worker.ts`). While `API_BACKEND` isn't `next` (the default, and production until cutover) they forward to the Worker unchanged. A route file's unported methods are `forwardToWorker` so writes still reach the Worker. Ported so far:
  - **2A:** GET `/content/[section]`, `/carousel`, `/faqs`, `/tacs`, `/categories`, `/services`, `/services/[id]`, `/services/[id]/gallery` and `/nailists`, plus POST/DELETE `/upload/image`.
  - **2B:** booking, appointments and payments (`/booking/*`, `/appointments/*`, `/payment/*`, `/settings/payment`).
  - **2C:** everything else: the CMS and catalog writes (content, carousel, FAQs, terms, categories, services, gallery, nailists with their services, time slots and days off), `/directory`, `/users/*` (profile, admins, promote-admin, stamps, QR scan, redeem, scan history), `/submit`, `/emails` and `/health`. Every Worker endpoint now has a route file; only unknown paths still fall back to the Worker.
  - **Artist gallery (new, no Worker equivalent):** GET and POST `/nailists/:id/gallery`, DELETE `/nailist-gallery/:id` (table `nailist_gallery`, migration `20261012000000_nailist_gallery.sql`). Shown on the public artist page `/artists/[id]`; the admin edits it in the Nail Artists screen. Until the table exists in a database, or while `API_BACKEND` isn't `next`, the gallery request fails and the page simply shows no gallery.
  - **Dashboard (new, no Worker equivalent):** GET `/dashboard?range=week|month|last30|last90|year`, admin only (table queries in `src/server/dashboard.ts`). While `API_BACKEND` isn't `next` the request is forwarded to the Worker, answered 404, and the screen shows its error state.
  - **Warm leads (new, no Worker equivalent):** GET `/leads`, admin only: the Clerk ids of client accounts that haven't booked (no confirmed or completed appointment) and were active (account made or booking started) in the last 60 days. The dashboard counts them under Needs attention; the Client Directory shows just them at `/client-directory?view=leads`.
  - **Artist utilization (new, no Worker equivalent):** GET `/utilization?week=YYYY-MM-DD`, admin only (`src/server/utilization.ts`): for the Monday-to-Sunday week holding that date, each artist's active bookings per day against their time slots (none on a regular or one-off day off). Shown on the dashboard as a week grid with its own arrows.
  - **Client pages (new, no Worker equivalent):** GET `/clients/:id` (profile, summary, every appointment), `/clients/:id/notes` (GET, POST with an optional `appointment_id`), `/clients/:id/notes/:noteId` (PUT, DELETE) and `/clients/:id/next-steps` (GET, PUT), admin only, in `src/server/handlers/clients.ts`; tables from migration `20261014000000_client_notes.sql`. The admin page is `/clients/[id]` (`src/admin/ClientPage.tsx`), opened from the dashboard's bookings table and sales record; the shared walk-in guest and admins have no page.
  - **Directory profiles (new, no Worker equivalent):** GET `/directory/profiles`, admin only (`src/server/handlers/directoryProfiles.ts`): each Clerk user's uploaded photo, join date and last sign-in by Clerk id, for the directory cards (`/directory` keeps the Worker's columns). A Clerk failure answers `{ profiles: {} }` and the cards show initials.
  - **Handlers:** the 2B and 2C handlers live in `src/server/handlers/`, and the route files under `src/app/api/` only map URLs, including the Worker's alias paths, to them.
- **Access rules (stricter than the Worker):** the ported routes don't copy the Worker's open access. Access comes from the verified session:
  - **Owner or admin:** appointment by id, payment details, payment create, reschedule and refund.
  - **Owner only:** proof upload.
  - **Admin only:** the appointment list, status changes, admin booking, the schedule, proof review and the payment settings PUT. Also every CMS/catalog write (including `/gallery/:id`, which the Worker left open), the directory, the admin list and promote-admin, `/users/stamps`, `/users/scan/*` and the scan history.
  - **Signed-in user's own:** `/users/profile` and `/users/redeem` use the session's user, not the `clerk_id` param; `/users/appointments` and `/users/clerk/:id` are owner or admin.
  - **`/emails`:** answers `{ success: true }` without sending. The confirmation emails go out on the server when a payment is confirmed; the Worker's route emailed whatever it was sent.
  - **Booking create:** uses the session's user, not `user_id` from the body.
  - **Xendit webhook:** must carry `x-callback-token` equal to `XENDIT_CALLBACK_TOKEN`, or it's refused.
- **Emails** (`src/server/email.ts`) HTML-escape every value and are sent after the response with `after()` (`inBackground` in `src/server/http.ts`).
- **Server modules:** `src/server/` holds the server-only code (`import "server-only"`):
  - `db.ts`: postgres.js on `DATABASE_URL`, the Supabase transaction pooler, `prepare: false`. Values go in as template parameters. Without prepared statements, array parameters aren't typed, so build `OR` fragments instead.
  - `auth.ts`: the Clerk-verified requester, with roles from `users.role`. The `clerk_id` header is never trusted.
  - `r2.ts`: R2 through the S3 API.
  - `catalog.ts`: the read queries.
  - `clerkSync.ts`: directory sync with Clerk (names, `publicMetadata.role`, deletes). Clerk errors are logged, never fail the request.
- **Response parity:** responses must match the Worker's exactly (columns, order, number types; cast `count(*)` to `int`).
- **Schema and seed:** the schema is in `supabase/migrations/` and is the D1 schema translated: same columns, 0/1 integer flags, text dates and times, RLS on with no policies. Schema changes are new files in `supabase/migrations/`. `supabase/seed.sql` is dev/test data, edited by hand (its old generator read the removed `database/init.sql`); never load it into production.
- **Tests:** `npm run test:db` runs `src/tests/db` against a throwaway Docker Postgres. The files run one at a time, since each rebuilds the schema through `testDatabase.ts`. Plain `npm test` skips those tests.
