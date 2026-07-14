create table public.rooms (
  code text primary key check (char_length(code) = 6),
  layout text not null check (layout in ('vertical', 'grid')),
  theme text not null check (theme in ('dark', 'light', 'color')),
  host_photos jsonb not null default '[]'::jsonb,
  guest_photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
create policy "rooms public read" on public.rooms for select using (true);
create policy "rooms public create" on public.rooms for insert with check (true);
create policy "rooms public update" on public.rooms for update using (true) with check (true);

alter publication supabase_realtime add table public.rooms;
