-- Completing a visit, continued: when the client arrived and the late fee the salon's terms set
-- (₱100 from 15 minutes late, ₱150 from 20), and how many nail photos were added, so a visit
-- completed without them is on the admins' to-do list until they're added.
alter table visit_completions
  add column arrived_at text,
  add column late_fee integer not null default 0 check (late_fee >= 0),
  add column photos_added integer not null default 0,
  -- The visit's one nail photo (also in the artist's gallery); a new one replaces it
  add column photo_url text;
