-- Indexes for the queries Supabase's Query Performance report showed as the busiest.

-- The expiry sweep (cancelExpiredPendingAppointments) runs before every booking read: it looks for
-- unpaid holds past expires_at, and for pending payments. Both are a handful of rows, so partial
-- indexes on exactly the sweep's conditions keep it from reading the whole tables each time.
create index if not exists idx_appointments_pending_expiry
  on appointments (expires_at) where upper(status) = 'PENDING';
create index if not exists idx_payments_pending
  on payments (appointment_id) where upper(status) = 'PENDING';
