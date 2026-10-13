-- A review shows on the home page only once an admin approves it. Off by default.

alter table reviews
  add column approved integer not null default 0 check (approved in (0, 1)),
  add column approved_by integer references users (id) on delete set null,
  add column approved_at text;
create index idx_reviews_approved on reviews (approved) where approved = 1;
