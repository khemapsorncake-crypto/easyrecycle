-- EasyRecycle V1.3
-- ถ้าสร้างตารางจากชุดก่อนหน้าแล้ว สามารถ Run ชุดนี้ซ้ำได้

create table if not exists products (
  id bigint generated always as identity primary key,
  code text unique,
  name text not null,
  category text,
  unit text default 'kg',
  buy_price numeric(12,2) default 0,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists customers (
  id bigint generated always as identity primary key,
  name text not null,
  phone text,
  note text,
  created_at timestamptz default now()
);

create table if not exists purchases (
  id bigint generated always as identity primary key,
  receipt_no text unique not null,
  purchase_date date not null default current_date,
  customer_id bigint references customers(id) on delete set null,
  seller_name text,
  seller_phone text,
  seller_note text,
  payment_method text default 'cash',
  total_weight numeric(12,3) default 0,
  total_rounds integer default 0,
  subtotal numeric(12,2) default 0,
  discount numeric(12,2) default 0,
  net_total numeric(12,2) default 0,
  status text default 'completed',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists purchase_items (
  id bigint generated always as identity primary key,
  purchase_id bigint not null references purchases(id) on delete cascade,
  product_id bigint references products(id) on delete set null,
  product_code text,
  product_name text not null,
  unit text default 'kg',
  price_per_unit numeric(12,2) default 0,
  total_weight numeric(12,3) default 0,
  round_count integer default 0,
  line_total numeric(12,2) default 0,
  created_at timestamptz default now()
);

create table if not exists weigh_rounds (
  id bigint generated always as identity primary key,
  purchase_item_id bigint not null references purchase_items(id) on delete cascade,
  round_number integer not null,
  weight numeric(12,3) not null default 0,
  note text,
  created_at timestamptz default now(),
  unique(purchase_item_id,round_number)
);

create table if not exists store_settings (
  id bigint generated always as identity primary key,
  store_name text default 'ร้านรับซื้อของเก่า',
  address text,
  phone text,
  tax_id text,
  receipt_footer text default 'ขอบคุณที่ใช้บริการ',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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

insert into store_settings(store_name,receipt_footer)
select 'ร้านรับซื้อของเก่า','ขอบคุณที่ใช้บริการ'
where not exists(select 1 from store_settings);
