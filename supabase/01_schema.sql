-- ============================================================
-- AJS Redzone Portal — initial schema
-- Run this in the Supabase SQL editor on a fresh project.
-- All monetary values stored in pence (integers), never floats.
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------- Products ----------
create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  sku             text unique not null,
  name            text not null,
  description     text,
  category        text not null,                  -- 'panel' | 'sensor' | 'accessory' | 'software' | 'peripheral'
  plc             text,                           -- 'Siemens' | 'Allen Bradley' | null
  material        text,                           -- 'Mild Steel' | 'Stainless Steel' | null
  io_count        int,                            -- 8 | 16 | 24 | null
  price_gbp_pence bigint not null,                -- e.g. 147500 for £1475
  stock_status    text not null default 'In Stock', -- free text per FR-05
  lead_time       text not null default '3–5 days',
  image_url       text,
  sort_order      int not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_products_category on public.products (category) where active;
create index if not exists idx_products_active on public.products (active);

-- ---------- Quote reference sequence (per calendar year) ----------
-- Helper function that returns the next quote ref in the URS format
-- Q[YY]-RZ[####], resetting at 0001 each year (URS Section 4).
create table if not exists public.quote_ref_sequence (
  year smallint primary key,
  next_value int not null default 1
);

create or replace function public.allocate_quote_ref()
returns text
language plpgsql
as $$
declare
  yr smallint := extract(year from now() at time zone 'Europe/London')::smallint;
  yy text := lpad((yr % 100)::text, 2, '0');
  nv int;
begin
  insert into public.quote_ref_sequence (year, next_value)
    values (yr, 2)
    on conflict (year) do update
      set next_value = public.quote_ref_sequence.next_value + 1
    returning next_value - 1 into nv;

  return 'Q' || yy || '-RZ' || lpad(nv::text, 4, '0');
end;
$$;

-- ---------- Quotes ----------
create table if not exists public.quotes (
  id                  uuid primary key default gen_random_uuid(),
  ref                 text unique not null,         -- Q26-RZ0001
  status              text not null default 'quote_submitted',
                                                    -- quote_submitted | order_confirmed | in_build
                                                    -- | ready_to_ship | shipped | complete | cancelled
  currency            text not null default 'GBP',  -- 'GBP' | 'EUR' (FR-04)
  fx_rate_used        numeric(10,6),                -- snapshot of GBP->EUR rate at quote time
  -- customer contact
  contact_name        text not null,
  contact_company     text,
  contact_email       text not null,
  contact_phone       text,
  -- delivery / site
  site_address_line1  text,
  site_address_line2  text,
  site_address_city   text,
  site_address_postcode text,
  site_country        text default 'United Kingdom',
  -- project
  required_date       date,                          -- Estimated Start Date
  project_description text,
  -- installation request
  install_requested   boolean not null default false,
  install_details     jsonb,                         -- questionnaire blob, FR-28
  -- account info captured at acceptance (FR-16/17)
  account_info        jsonb,
  gdpr_consent_at     timestamptz,
  -- totals (pence, in GBP — display conversion happens client-side)
  subtotal_gbp_pence  bigint not null default 0,
  -- magic link
  magic_token         text unique,
  magic_expires_at    timestamptz,
  -- FOC override (admin only)
  is_foc              boolean not null default false,
  -- audit
  internal_notes      text,
  created_at          timestamptz not null default now(),
  submitted_at        timestamptz,
  accepted_at         timestamptz,
  updated_at          timestamptz not null default now()
);

create index if not exists idx_quotes_status on public.quotes (status);
create index if not exists idx_quotes_created on public.quotes (created_at desc);
create index if not exists idx_quotes_email on public.quotes (contact_email);

-- ---------- Quote items ----------
create table if not exists public.quote_items (
  id                  uuid primary key default gen_random_uuid(),
  quote_id            uuid not null references public.quotes(id) on delete cascade,
  product_id          uuid references public.products(id),
  sku                 text not null,                 -- snapshot — survives product deletion
  name                text not null,
  qty                 int not null check (qty > 0),
  -- price snapshot at quote time (FR-44 — historic quote prices preserved)
  unit_price_gbp_pence bigint not null,
  line_total_gbp_pence bigint not null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_quote_items_quote on public.quote_items (quote_id);

-- ---------- Updated-at trigger ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_quotes_updated on public.quotes;
create trigger trg_quotes_updated before update on public.quotes
  for each row execute function public.set_updated_at();

-- ---------- Row Level Security ----------
-- Phase 1: catalogue is publicly readable; writes happen via server actions
-- using the service role key (which bypasses RLS).
alter table public.products enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;

drop policy if exists "products read public" on public.products;
create policy "products read public"
  on public.products for select
  using (active = true);

-- Quotes & quote_items have NO public policies — only service role can read/write.
-- Customer-facing read happens later via a server-side magic-link verification.
