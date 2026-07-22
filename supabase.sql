-- EasyRecycle Internal: ใช้ภายในและไม่มีระบบ Login
-- รันไฟล์นี้ครั้งเดียวใน Supabase > SQL Editor > New query > Run

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  unit text not null default 'กก.',
  price numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  bill_no text not null unique,
  bill_date date not null,
  seller text not null default 'ไม่ระบุชื่อ',
  phone text,
  note text,
  payment text not null default 'เงินสด',
  total_weight numeric(14,2) not null default 0,
  total_rounds integer not null default 0,
  total numeric(14,2) not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.bills enable row level security;
alter table public.app_settings enable row level security;

-- ไม่มี Login: อนุญาต anon อ่าน/เขียน เพื่อใช้ภายในตามที่กำหนด
-- ผู้ที่รู้ URL เว็บสามารถใช้ระบบได้ จึงไม่ควรเผยแพร่ลิงก์สู่สาธารณะ

drop policy if exists "internal products all" on public.products;
create policy "internal products all" on public.products for all to anon using (true) with check (true);

drop policy if exists "internal bills all" on public.bills;
create policy "internal bills all" on public.bills for all to anon using (true) with check (true);

drop policy if exists "internal settings all" on public.app_settings;
create policy "internal settings all" on public.app_settings for all to anon using (true) with check (true);

create index if not exists bills_bill_date_idx on public.bills (bill_date desc);
create index if not exists bills_created_at_idx on public.bills (created_at desc);
