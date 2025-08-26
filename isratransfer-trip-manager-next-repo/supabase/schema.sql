-- Enable UUID extension if needed
create extension if not exists "uuid-ossp";

-- Teams (optional multi-user grouping)
create table if not exists public.teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null
);

-- Profiles (1-1 with auth.users) with role and team
create type public.user_role as enum ('admin','staff');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'staff',
  team_id uuid references public.teams(id),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles are visible to themselves and admins of same team"
  on public.profiles for select
  using (
    auth.uid() = id or (
      exists (
        select 1 from public.profiles p2
        where p2.id = auth.uid() and p2.role = 'admin' and p2.team_id = profiles.team_id
      )
    )
  );

create policy "users can insert their profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "users can update their profile (name/team/role only by admin)"
  on public.profiles for update
  using (auth.uid() = id or exists (select 1 from public.profiles p2 where p2.id = auth.uid() and p2.role = 'admin' and p2.team_id = profiles.team_id))
  with check (true);

-- Trips
create table if not exists public.trips (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references public.teams(id),
  title text not null,
  location text,
  start_date date,
  end_date date,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.trips enable row level security;

create policy "team members can view trips"
  on public.trips for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.team_id = trips.team_id));

create policy "staff can insert trips for their team"
  on public.trips for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.team_id = trips.team_id));

create policy "owner or admin can update trip"
  on public.trips for update
  using (
    created_by = auth.uid() or
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.team_id = trips.team_id)
  )
  with check (true);

create policy "admin can delete trip"
  on public.trips for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.team_id = trips.team_id));

-- Flights
create table if not exists public.flights (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  type text check (type in ('International','Internal')) default 'International',
  airline text,
  flight_number text,
  depart_airport text,
  arrive_airport text,
  depart_time timestamptz,
  arrive_time timestamptz,
  notes text,
  created_at timestamptz default now()
);
alter table public.flights enable row level security;

create policy "team members can view flights of team trips"
  on public.flights for select
  using (exists (select 1 from public.trips t join public.profiles p on p.team_id = t.team_id where t.id = flights.trip_id and p.id = auth.uid()));

create policy "team members can insert flights"
  on public.flights for insert
  with check (exists (select 1 from public.trips t join public.profiles p on p.team_id = t.team_id where t.id = flights.trip_id and p.id = auth.uid()));

create policy "team members can update flights"
  on public.flights for update
  using (exists (select 1 from public.trips t join public.profiles p on p.team_id = t.team_id where t.id = flights.trip_id and p.id = auth.uid()))
  with check (true);

create policy "admin can delete flights"
  on public.flights for delete
  using (exists (select 1 from public.trips t join public.profiles p on p.team_id = t.team_id where t.id = flights.trip_id and exists (select 1 from public.profiles p2 where p2.id = auth.uid() and p2.role='admin' and p2.team_id = t.team_id)));

-- Hotel (one per trip)
create table if not exists public.hotels (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  name text,
  address text,
  check_in timestamptz,
  check_out timestamptz,
  confirmation text,
  notes text
);
alter table public.hotels enable row level security;
create policy "team members can view hotels" on public.hotels for select using (exists (select 1 from public.trips t join public.profiles p on p.team_id = t.team_id where t.id = hotels.trip_id and p.id = auth.uid()));
create policy "team members upsert hotel" on public.hotels for insert with check (exists (select 1 from public.trips t join public.profiles p on p.team_id = t.team_id where t.id = hotels.trip_id and p.id = auth.uid()));
create policy "team members update hotel" on public.hotels for update using (exists (select 1 from public.trips t join public.profiles p on p.team_id = t.team_id where t.id = hotels.trip_id and p.id = auth.uid())) with check (true);
create policy "admin delete hotel" on public.hotels for delete using (exists (select 1 from public.trips t join public.profiles p on p.team_id = t.team_id where t.id = hotels.trip_id and exists (select 1 from public.profiles p2 where p2.id = auth.uid() and p2.role='admin' and p2.team_id = t.team_id)));

-- Car hire (one per trip)
create table if not exists public.car_hires (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  company text,
  pickup_location text,
  pickup_date timestamptz,
  dropoff_date timestamptz,
  confirmation text,
  notes text
);
alter table public.car_hires enable row level security;
create policy "team members can view car hires" on public.car_hires for select using (exists (select 1 from public.trips t join public.profiles p on p.team_id = t.team_id where t.id = car_hires.trip_id and p.id = auth.uid()));
create policy "team members upsert car hire" on public.car_hires for insert with check (exists (select 1 from public.trips t join public.profiles p on p.team_id = t.team_id where t.id = car_hires.trip_id and p.id = auth.uid()));
create policy "team members update car hire" on public.car_hires for update using (exists (select 1 from public.trips t join public.profiles p on p.team_id = t.team_id where t.id = car_hires.trip_id and p.id = auth.uid())) with check (true);
create policy "admin delete car hire" on public.car_hires for delete using (exists (select 1 from public.trips t join public.profiles p on p.team_id = t.team_id where t.id = car_hires.trip_id and exists (select 1 from public.profiles p2 where p2.id = auth.uid() and p2.role='admin' and p2.team_id = t.team_id)));

-- Invoices
create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references public.trips(id) on delete cascade,
  name text not null,
  mime_type text,
  size bigint,
  file_path text not null,
  uploaded_at timestamptz default now()
);
alter table public.invoices enable row level security;
create policy "team members can view invoices" on public.invoices for select using (exists (select 1 from public.trips t join public.profiles p on p.team_id = t.team_id where t.id = invoices.trip_id and p.id = auth.uid()));
create policy "team members can insert invoices" on public.invoices for insert with check (exists (select 1 from public.trips t join public.profiles p on p.team_id = t.team_id where t.id = invoices.trip_id and p.id = auth.uid()));
create policy "admin or creator can delete invoices" on public.invoices for delete using (exists (select 1 from public.trips t join public.profiles p on p.team_id = t.team_id where t.id = invoices.trip_id and p.id = auth.uid()));

-- Storage bucket and policies (run in SQL editor)
-- 1) Create storage bucket named 'invoices' with public = false
-- In Dashboard Storage UI or via:
-- select storage.create_bucket('invoices', public => false);

-- 2) Restrictive storage RLS
-- Allow any authenticated user to read/write objects for trips in their team:
create policy if not exists "team read invoices"
  on storage.objects for select
  using (
    bucket_id = 'invoices' and
    exists (
      select 1
      from public.invoices i
      join public.trips t on t.id = i.trip_id
      join public.profiles p on p.team_id = t.team_id
      where i.file_path = storage.objects.name and p.id = auth.uid()
    )
  );

create policy if not exists "team upload invoices"
  on storage.objects for insert
  with check (
    bucket_id = 'invoices' and
    exists (
      select 1 from public.profiles p where p.id = auth.uid()
    )
  );

create policy if not exists "team delete invoices"
  on storage.objects for delete
  using (
    bucket_id = 'invoices' and
    exists (
      select 1
      from public.invoices i
      join public.trips t on t.id = i.trip_id
      join public.profiles p on p.team_id = t.team_id
      where i.file_path = storage.objects.name and p.id = auth.uid()
    )
  );
