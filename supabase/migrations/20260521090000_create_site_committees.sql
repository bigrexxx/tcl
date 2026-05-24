-- Create table for site editable committees
create table if not exists public.site_committees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text,
  description text,
  icon text,
  director jsonb,
  highlights jsonb,
  extra jsonb,
  image text,
  created_at timestamptz default now()
);

-- Optional index for faster lookups by name
create index if not exists site_committees_name_idx on public.site_committees (lower(name));
