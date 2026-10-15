# Backend requirements

Work handed to the backend developer. Paths are relative to the repo root; see `CLAUDE.md` for the app's structure.

> **Before the Phase 3 cutover**, production still runs on the Worker and D1. Anything built here on Supabase goes live only after the cutover (or once `API_BACKEND=next`), unless it's also added to the Worker.

## 1. Handoff: birthday / promo offers and more payment options (2026-10-14)

Owner requests #12 (birthday/promo offers) and #7 (more payment options).

### 1.1 Birthday / promo offers (#12)

**Already in place**
- Clients enter their birthday during onboarding. It's saved as `customer_profiles.dob` (`YYYY-MM-DD`) by `PUT /users/profile` (`src/server/handlers/users.ts`), and they can change it on their profile's Edit details sheet.
- The admin client page shows the birthday (`birthdayLabel` in `src/lib/admin/clientPage.ts`).
- Emails go out through Resend in `src/server/email.ts`, which HTML-escapes every value and sends after the response with `inBackground` (`src/server/http.ts`).
- There are no promos, discounts or vouchers yet. The only discount is the loyalty card's 30% reward, which staff apply by hand.

**To build**
1. **Agree the rules with the owner:** what the birthday offer is (% off or a fixed amount), how long it lasts (the birthday month, or ±7 days), whether it's once a year, and whether it can be combined with the loyalty reward.
2. **Schema:** a new migration in `supabase/migrations/`, e.g.
   - `promos`: code, kind, value, start/end, active.
   - `client_offers`: user, promo, issued_at, expires_at, redeemed_at, appointment_id.

   Follow the existing style: 0/1 integer flags, text dates, RLS on with no policies.
3. **Birthday job:** a daily Vercel Cron (`vercel.json` plus a route like `src/app/api/cron/birthdays/route.ts`, protected by `CRON_SECRET`). It finds clients whose birthday falls in the window, issues the offer once per year and sends a birthday email.
4. **Applying the offer:** decide whether it lowers the price or only shows as a note. The downpayment is a flat amount from `site_settings` (`src/server/payments.ts`), and the dashboard's money figures use list prices (`src/server/dashboard.ts`). So the simplest version is a note the admin sees on the appointment; changing the totals touches booking, payments and the dashboard.
5. **Client side:** show active offers on `/profile` (`views/account/Profile.tsx`), like the loyalty card, and possibly on the booking summary.
6. **Admin side:**
   - A Promos screen under Content Management (CRUD), following the admin conventions: state in a hook in `src/hooks/admin/`, helpers in `src/lib/admin/`, fetches in `src/services/`, and a JSX-only screen in `src/admin/`.
   - A "Birthday this month" marker and a redeem button on the client page or in the appointment drawer (`components/features/admin/bookings/AppointmentDetailsModal.tsx`).
7. **Dashboard (optional):** "birthdays this week" under Needs attention (`src/lib/dashboardInsights.ts`).
8. **Tests:** DB tests in `src/tests/db` for issuing (once per year), expiry and redemption.

### 1.2 More payment options (#7)

**Already in place**
- The server already supports `GCASH`, `PAYMAYA`, `GRABPAY`, `SHOPEEPAY`, `CREDIT_CARD`, `QRPH` and `MANUAL` (`src/server/payments.ts`). Each one is a Xendit invoice limited to that channel.
- `site_settings.payment_methods` and `downpayment_amount` are read and written through `GET`/`PUT /settings/payment` (the PUT is admin only; `src/server/handlers/payments.ts`).
- The front end deliberately offers only QR Ph: `OFFERED_PAYMENT_METHODS = ["QRPH"]` in `src/data/payment.ts`, which `src/hooks/usePayment.ts` uses to filter the list.

**To do**
1. **Turn on the channels in Xendit:** check which ones are activated on the salon's Xendit account. An inactive channel makes invoice creation fail (`createXenditInvoice` logs `XENDIT CREATE INVOICE ERROR`).
2. **Front end:** widen `OFFERED_PAYMENT_METHODS`, or remove it and let `site_settings` decide. Add hints in `PAYMENT_METHOD_HINTS`, and check that the method picker in `views/booking/Payment.tsx` works with several options.
3. **Admin settings screen:** there's no admin UI for `/settings/payment` today. Add a Payment Settings screen with the downpayment amount and checkboxes for the enabled channels, using the existing PUT.
4. **Defaults:** if `payment_methods` was never saved, the server falls back to `["GCASH"]` (`DEFAULT_PAYMENT_METHODS`). Once more channels are offered, give it a sensible default or seed the setting.
5. **Manual (bank transfer / proof upload):** if the owner wants it as an option on the payment screen, it needs its own path, since payment create refuses `MANUAL` and it's only used for proof upload today.
6. **Webhook and refunds:** test the Xendit webhook (`x-callback-token` must equal `XENDIT_CALLBACK_TOKEN`) and refunds for each new channel. Card refunds behave differently from e-wallet refunds.
7. **Tests:** update `src/tests/paymentMethods.test.tsx` and `src/tests/db/bookingPayments.test.ts`.
