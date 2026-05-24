-- Create table for site editable team members
create table if not exists public.site_team (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  dept text,
  image_url text,
  sort_order integer default 0,
  extra jsonb,
  created_at timestamptz default now()
);

create index if not exists site_team_name_idx on public.site_team (lower(name));
