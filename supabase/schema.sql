-- Enable extensions
create extension if not exists pgcrypto;

-- Trips
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  dest_city text,
  dest_country text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

-- Flights
create table if not exists public.flights (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  carrier text,
  flight_number text,
  depart_airport text,
  arrive_airport text,
  depart_time timestamptz,
  arrive_time timestamptz,
  cost_amount numeric(12,2),
  cost_currency text check (cost_currency in ('GBP','USD','CAD','EUR','ILS')),
  notes text,
  created_at timestamptz not null default now()
);

-- Accommodations
create table if not exists public.accommodations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text,
  address text,
  check_in date,
  check_out date,
  cost_amount numeric(12,2),
  cost_currency text check (cost_currency in ('GBP','USD','CAD','EUR','ILS')),
  confirmation_number text,
  notes text,
  created_at timestamptz not null default now()
);

-- Transports
create table if not exists public.transports (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  kind text check (kind in ('car_hire','taxi','tolls','train','bus','other')),
  date date,
  vendor text,
  cost_amount numeric(12,2),
  cost_currency text check (cost_currency in ('GBP','USD','CAD','EUR','ILS')),
  notes text,
  created_at timestamptz not null default now()
);

-- Itinerary events
create table if not exists public.itinerary_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  location text,
  start_time timestamptz,
  end_time timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- Auto-set created_by from auth.uid() if the client didn't send it
create or replace function public.set_created_by()
returns trigger
language plpgsql
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

do $$ begin
  create trigger set_created_by_trips
    before insert on public.trips
    for each row execute function public.set_created_by();
exception when others then null;
end $$;

do $$ begin
  create trigger set_created_by_flights
    before insert on public.flights
    for each row execute function public.set_created_by();
exception when others then null;
end $$;

do $$ begin
  create trigger set_created_by_accommodations
    before insert on public.accommodations
    for each row execute function public.set_created_by();
exception when others then null;
end $$;

do $$ begin
  create trigger set_created_by_transports
    before insert on public.transports
    for each row execute function public.set_created_by();
exception when others then null;
end $$;

do $$ begin
  create trigger set_created_by_itinerary_events
    before insert on public.itinerary_events
    for each row execute function public.set_created_by();
exception when others then null;
end $$;

-- RLS
alter table public.trips enable row level security;
alter table public.flights enable row level security;
alter table public.accommodations enable row level security;
alter table public.transports enable row level security;
alter table public.itinerary_events enable row level security;

-- Owner policy for all tables
create policy "owner all - trips" on public.trips
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "owner all - flights" on public.flights
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "owner all - accommodations" on public.accommodations
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "owner all - transports" on public.transports
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "owner all - itinerary_events" on public.itinerary_events
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
