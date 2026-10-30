-- Artist roles the admin can edit: each role says which price an artist with it charges
-- (the master price or the junior price), and an artist can hide their role on the site.
alter table nailist_categories add column if not exists is_master integer not null default 0;
update nailist_categories set is_master = 1 where name = 'Master Technician';
alter table nailists add column if not exists hide_position integer not null default 0;
