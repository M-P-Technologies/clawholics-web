-- The order the admin gives the artists (dragged in Admin > Artists): the Artists page, the home
-- page's spotlight and the booking list follow it. Artists so far keep the order they had (by id).
-- Safe to run again (by hand first, then by the migrations workflow): it only fills artists not numbered yet.
alter table nailists add column if not exists display_order integer not null default 0;
update nailists n set display_order = o.rank
  from (select id, row_number() over (order by id) as rank from nailists) o
  where o.id = n.id and n.display_order = 0;
