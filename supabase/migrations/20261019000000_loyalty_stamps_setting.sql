-- The stamps a loyalty card needs for a reward, edited in Admin > Settings (it was fixed at 10)
insert into site_settings (key, value) values ('loyalty_stamps_required', '10') on conflict (key) do nothing;
