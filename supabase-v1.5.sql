-- EasyRecycle V1.5 migration
-- Run this ONCE in Supabase SQL Editor. Safe to run again.

alter table if exists purchases
  add column if not exists bill_json jsonb;

create index if not exists idx_purchases_receipt_no on purchases(receipt_no);
create index if not exists idx_purchases_purchase_date on purchases(purchase_date);

-- Keep RLS on, but allow the internal no-login web app.
alter table products enable row level security;
alter table customers enable row level security;
alter table purchases enable row level security;
alter table purchase_items enable row level security;
alter table weigh_rounds enable row level security;
alter table store_settings enable row level security;

drop policy if exists "internal products access" on products;
drop policy if exists "internal customers access" on customers;
drop policy if exists "internal purchases access" on purchases;
drop policy if exists "internal purchase items access" on purchase_items;
drop policy if exists "internal weigh rounds access" on weigh_rounds;
drop policy if exists "internal store settings access" on store_settings;

create policy "internal products access" on products for all to anon using (true) with check (true);
create policy "internal customers access" on customers for all to anon using (true) with check (true);
create policy "internal purchases access" on purchases for all to anon using (true) with check (true);
create policy "internal purchase items access" on purchase_items for all to anon using (true) with check (true);
create policy "internal weigh rounds access" on weigh_rounds for all to anon using (true) with check (true);
create policy "internal store settings access" on store_settings for all to anon using (true) with check (true);
