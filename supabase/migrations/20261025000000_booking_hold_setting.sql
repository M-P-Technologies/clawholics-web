-- How long a new booking holds its slot while the client pays, edited in Admin > Settings (it was
-- fixed at 5 minutes)
insert into site_settings (key, value) values ('booking_hold_minutes', '5') on conflict (key) do nothing;
