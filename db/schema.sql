-- Supabase Postgres schema for MVP
create extension if not exists btree_gist;

-- Users are managed by Supabase Auth; reference auth.users
create table if not exists public.profiles (
	user_id uuid primary key references auth.users(id) on delete cascade,
	full_name text,
	phone text,
	role text check (role in ('player','owner','admin')) default 'player',
	created_at timestamptz not null default now()
);

-- Facilities (turfs)
create table if not exists public.facilities (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users(id) on delete cascade,
	name text not null,
	city text not null,
	address text,
	sport text not null, -- e.g., football, cricket, badminton
	price_per_hour integer not null,
	status text not null default 'pending' check (status in ('pending','approved','rejected')),
	created_at timestamptz not null default now()
);

-- Courts under a facility
create table if not exists public.courts (
	id uuid primary key default gen_random_uuid(),
	facility_id uuid not null references public.facilities(id) on delete cascade,
	name text not null
);

-- Availability rules (recurring or specific date windows)
create table if not exists public.availability_rules (
	id uuid primary key default gen_random_uuid(),
	court_id uuid not null references public.courts(id) on delete cascade,
	weekday int check (weekday between 0 and 6), -- 0 Sun ... 6 Sat, null for specific date
	specific_date date,
	start_time time not null,
	end_time time not null,
	interval_minutes int not null default 60
);

-- Bookings
create table if not exists public.bookings (
	id uuid primary key default gen_random_uuid(),
	player_id uuid not null references auth.users(id) on delete cascade,
	court_id uuid not null references public.courts(id) on delete cascade,
	start_ts timestamptz not null,
	end_ts timestamptz not null,
	status text not null default 'confirmed' check (status in ('confirmed','cancelled','completed')),
	payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed')),
	created_at timestamptz not null default now(),
	constraint bookings_time_check check (end_ts > start_ts)
);

-- Prevent double booking: no overlapping bookings for same court
create unique index if not exists bookings_no_overlap
on public.bookings using gist (
	court_id,
	tstzrange(start_ts, end_ts, '[)') with &&
);

-- Payments (Phase 2 compatible)
create table if not exists public.payments (
	id uuid primary key default gen_random_uuid(),
	booking_id uuid not null references public.bookings(id) on delete cascade,
	provider text not null default 'razorpay',
	amount integer not null,
	currency text not null default 'INR',
	status text not null check (status in ('created','authorized','captured','failed','refunded')),
	provider_ref text,
	created_at timestamptz not null default now()
);

-- Leaderboard (materialized via cron or realtime function later)
create view if not exists public.leaderboard as
select player_id, count(*)::int as bookings_count
from public.bookings
where status in ('confirmed','completed')
group by player_id
order by bookings_count desc;

-- RLS policies (basic)
alter table public.profiles enable row level security;
alter table public.facilities enable row level security;
alter table public.courts enable row level security;
alter table public.availability_rules enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;

-- Public readable facilities/courts
create policy if not exists "Public read facilities" on public.facilities
	for select using (true);
create policy if not exists "Public read courts" on public.courts
	for select using (true);

-- Owners manage their facilities
create policy if not exists "Owner manage facilities" on public.facilities
	for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Owners manage courts of their facilities
create policy if not exists "Owner manage courts" on public.courts
	for all using (exists (select 1 from public.facilities f where f.id = courts.facility_id and f.owner_id = auth.uid()))
	with check (exists (select 1 from public.facilities f where f.id = courts.facility_id and f.owner_id = auth.uid()));

-- Owners manage availability for their courts
create policy if not exists "Owner manage availability" on public.availability_rules
	for all using (exists (
		select 1 from public.courts c join public.facilities f on f.id = c.facility_id
		where c.id = availability_rules.court_id and f.owner_id = auth.uid()
	))
	with check (exists (
		select 1 from public.courts c join public.facilities f on f.id = c.facility_id
		where c.id = availability_rules.court_id and f.owner_id = auth.uid()
	));

-- Players can see and manage their own bookings
create policy if not exists "Player read bookings" on public.bookings
	for select using (auth.uid() = player_id);
create policy if not exists "Player manage bookings" on public.bookings
	for insert with check (auth.uid() = player_id);
create policy if not exists "Player update own bookings" on public.bookings
	for update using (auth.uid() = player_id) with check (auth.uid() = player_id);

