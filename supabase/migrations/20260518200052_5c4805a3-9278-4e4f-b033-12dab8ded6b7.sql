
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  committee_id text not null,
  committee_name text not null,
  full_name text not null,
  email text not null,
  phone text not null,
  matric text not null,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.studio_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_date date not null,
  time_slot text not null,
  package_id text not null,
  package_name text not null,
  full_name text not null,
  email text not null,
  phone text not null,
  project_type text not null,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (booking_date, time_slot)
);

create index if not exists idx_studio_bookings_date on public.studio_bookings (booking_date);
create index if not exists idx_registrations_committee on public.registrations (committee_id);

alter table public.registrations enable row level security;
alter table public.studio_bookings enable row level security;

-- Anyone (anon) can submit
create policy "anon can insert registrations" on public.registrations
  for insert to anon, authenticated with check (true);

create policy "anon can insert bookings" on public.studio_bookings
  for insert to anon, authenticated with check (true);

-- Public can read only the date+slot of confirmed/pending bookings (no PII) via a view
create or replace view public.studio_booked_slots
  with (security_invoker = true) as
  select booking_date, time_slot
  from public.studio_bookings
  where status in ('pending','confirmed');

grant select on public.studio_booked_slots to anon, authenticated;

-- Allow anon to read just date+slot directly (filtered) — needed by view's security_invoker
create policy "anon can read slot occupancy" on public.studio_bookings
  for select to anon, authenticated using (status in ('pending','confirmed'));
