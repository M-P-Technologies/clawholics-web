-- Redeeming a birthday voucher at the salon: the admin enters the client's code when completing
-- the visit. The voucher is then USED by that appointment (one visit per voucher, one voucher per
-- visit) and the visit's record keeps the discount it took off the service price.

alter table birthday_vouchers
  add column appointment_id integer unique references appointments (id) on delete set null;

alter table visit_completions
  add column voucher_discount integer not null default 0 check (voucher_discount >= 0);
