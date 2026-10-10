# Catalog Management Design

Sub-project 1 of 5 of the Clawholics website revamp. Date: 2026-10-07.

## Context and intent

The owner wants a full revamp of the site so they can manage it without a developer. This spec covers only the catalog: editable and removable services, editable categories, and support for the lash, brow and nail pricing shown on the owner's three pricelists (Nail Services, Russian Manicure, Eyelash Services, in `frontend/src/assets`).

Success criteria:
- An admin can create, rename, reorder and delete categories, and create, edit and delete services, from the admin area.
- Every item on the three pricelists can be represented and booked at the right price.
- A price edit never changes the price of an existing appointment.
- Behavior is identical in `backend/` (Express, SQLite) and `worker-api/` (Cloudflare Worker, D1).

Out of scope for this spec (separate specs): booking and payment changes (QR Ph, screenshot upload, phone field), client dashboard and admin notes, promos and birthday offers, reviews, theme settings and visual redesign.

Decisions already made with the owner's representative:
- Categories become a real table. Deleting a category that still has services is blocked.
- Lashes and brows are performed by the existing artists, but priced as flat services with options (not Master/Junior), based on the pricelists.
- Brow lamination and eyebrow lamination are one service (Korean Eyebrow Lamination). There is a Korean Eyelash Perm and no lash lift.

## Current state

- `services.category` is free text. Price is derived from the artist's tier: `master_price` or `junior_price` through a SQL `CASE` in `bookingRepository.ts`, `paymentController.ts` and `worker-api/src/index.ts`. Both prices are required.
- Appointments store `service_name` but not the price, so editing a price changes old appointments.
- The server computes the price. The `service_price` that `Booking.tsx` sends through router state is display only.
- `AS_NailServiceDropdown.tsx` is 724 lines and edits a service with a free-text category and two price inputs.

## Data model

New tables:
- `service_categories`: `id`, `name` (unique), `display_order`.
- `service_variants`: `id`, `service_id` (cascade delete), `name`, `price`, `display_order`. Each row is one fully priced choice, for example "Hybrid Cat Eye, Volume" at 550 and "Hybrid Cat Eye, Mega Volume" at 650.
- `addons`: `id`, `category_id`, `name`, `price`, `display_order`. A category's add-ons are offered with every service in it (length upgrade, removal options).

Changes to `services`:
- `category_id` references `service_categories`.
- `pricing_type`: `tiered` or `flat`.
- `price`: used when `flat`.
- `master_price` and `junior_price` become nullable. A null tier means that tier does not offer the service (Master has no pedicure on the pricelist). Tiered services need at least one tier price.
- `category` (text) stays until the new flow is verified, then is dropped in a follow-up migration.

Changes to `appointments`: snapshot columns for the chosen variant, the chosen add-ons and the total price at booking time. Old rows keep these empty and use the old tier-based calculation.

## API

Mirrored in `backend/` and `worker-api/`. GETs are public. Writes are admin-only through the existing RBAC.

- `GET /service-categories`, `POST`, `PUT /:id`, `DELETE /:id`, and a reorder call. Deleting a category that has services returns 409 with the service count.
- `/services` responses keep `master_price`, `junior_price` and `category` (name), and add `category_id`, `pricing_type`, `price`, `variants` and, through the category, `addons`. The old frontend therefore keeps working between deploys.
- Add-on and variant writes are part of the category and service write calls.
- Booking creation accepts a variant id and add-on ids. The server validates and computes the total, and stores the snapshot.

Validation:
- Prices are non-negative whole numbers.
- A flat service requires `price`. A tiered service requires at least one tier price.
- A service that has variants requires a variant selection at booking.
- Add-ons must belong to the service's category.
- The chosen artist's tier must offer the service.
- Errors: 400 with a field-level message, 404 for a missing item, 409 for the category rule.

## Admin UI

- A categories panel at the top of the Services page: ordered list with drag reorder (existing dnd-kit `SortableList`), add, rename, delete (inline 409 message "move or delete the N services first"), and per-category add-on management.
- `AS_NailServiceDropdown.tsx` is split into a basics form (name, description, duration, image, category select from the table), a pricing section that switches on `pricing_type` (tiered with "not offered" toggles, or flat), and a variants editor (ordered name and price rows).
- Errors show inline, not with `alert()`.

## Client UI

- `Services.tsx` filter buttons come from `GET /service-categories` in saved order. Cards show "starts at" with the lowest price.
- `Booking.tsx` adds a variant step when the service has variants and add-on checkboxes with a running total. It reads the price from the server, not router state. Only artists whose tier offers the service are shown.

## Migration and rollout

1. Export a backup of each D1 database (`wrangler d1 export`).
2. Create the new tables and columns. Backfill one category per distinct `services.category` text, set `category_id`, and mark all existing services `tiered`.
3. Apply the same changes in `database/init.sql`, idempotent because the Express backend runs it on every start.
4. Seed the pricelist catalog once: Manicure, Pedicure, Russian Manicure, Lashes and Brows, with variants and add-ons.
5. Order: migrate staging (the database in `wrangler.toml`), deploy the Worker, deploy the frontend, run a full booking with a Xendit test payment. Repeat on production. The old frontend stays compatible in between.
6. Drop `services.category` in a follow-up migration inside the project window.

## Testing

- Backend jest and supertest, in the style of `servicesCMS.test.ts`: category CRUD including the 409 rule, service create and update for both pricing types, variants and add-ons, validation errors, and server-side totals.
- The total calculation is a small pure function with a table of cases: Master softgel extension, Junior pedicure, Master pedicure rejected, Hybrid Cat Eye Mega Volume with a removal add-on, Russian Manicure plain color with length upgrade.
- The worker has no test setup and adding one is out of budget. The same case table is run manually with `wrangler dev` against staging D1.
- Frontend vitest component tests for the categories panel and the booking total, plus a manual browser pass of the booking flow.

## Open items and defaults

- Downpayment: it is a fixed 500 pesos and exceeds some pricelist items (Junior Manicure 200, tint only 180, removals 150). Default if the owner does not decide: keep the fixed 500, which is the current behavior and is not changed by this spec.
- Duration: lash and brow services use the same free-text `duration` field as nail services. Add-ons do not change duration. The owner supplies lash durations when the services are seeded.
- Contract risk: the work reworks price calculation, booking, payment and refunds in both APIs inside the fixed fee. The contract limits data entry to a one-time pricelist seed.
