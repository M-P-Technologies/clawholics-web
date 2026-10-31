-- A client can delete a cancelled appointment from their own list. The row stays (its payments, refunds and
-- forfeited downpayments still feed the salon's records); it's only hidden from that client's list.
alter table appointments add column hidden_by_client integer not null default 0;
