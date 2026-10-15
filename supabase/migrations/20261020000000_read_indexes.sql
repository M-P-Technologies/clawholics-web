-- Indexes for the reads that filter on columns nothing indexed yet. The tables are small today,
-- but these reads run on every client and admin screen and grow with every booking.

-- A client's own appointments (the client app, /users/appointments, the client page, reviews,
-- warm leads, visit counts)
create index if not exists idx_appointments_user on appointments (user_id);

-- Appointments by day and date range (the dashboard, the schedule, the admin list's on/from
-- filters, the booking calendar's slots-range). Dates are YYYY-MM-DD text, so a range is in order.
create index if not exists idx_appointments_date on appointments (appointment_date);

-- Whether a service is still booked before it's deleted
create index if not exists idx_appointments_service on appointments (service_id);

-- A client's stamp scan history
create index if not exists idx_scan_history_client on scan_history (client_clerk_id);
