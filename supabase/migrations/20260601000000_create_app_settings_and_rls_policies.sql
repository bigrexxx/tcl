-- Create app_settings table and enable row-level security for admin/history/content tables.
create table if not exists public.app_settings (
  id int primary key default 1,
  hourly_price_naira int not null default 8000,
  half_day_price_naira int not null default 25000,
  full_day_price_naira int not null default 45000,
  podcast_price_naira int not null default 15000,
  admin_whatsapp text not null default '',
  wa_gc_link text not null default '',
  ga_measurement_id text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Public settings can be read by the front-end.
drop policy if exists "anon can select app settings" on public.app_settings;
create policy "anon can select app settings" on public.app_settings
  for select to anon, authenticated using (true);

-- Protect admin history from direct public access.
alter table public.admin_history enable row level security;

drop policy if exists "deny anon access to admin history" on public.admin_history;
create policy "deny anon access to admin history" on public.admin_history
  for all to anon, authenticated using (false);

-- Allow public read-only access to site content tables.
alter table public.site_committees enable row level security;

drop policy if exists "anon can select site committees" on public.site_committees;
create policy "anon can select site committees" on public.site_committees
  for select to anon, authenticated using (true);

alter table public.site_team enable row level security;

drop policy if exists "anon can select site team" on public.site_team;
create policy "anon can select site team" on public.site_team
  for select to anon, authenticated using (true);
