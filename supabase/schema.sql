create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  semester text not null default '',
  section text not null default '',
  start_date date,
  end_date date,
  target_attendance numeric not null default 75 check (target_attendance > 0 and target_attendance <= 100),
  updated_at timestamptz not null default now()
);

create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  semester text not null default '', section text not null default '', start_date date, end_date date,
  target_attendance numeric not null default 75 check (target_attendance > 0 and target_attendance <= 100), updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, code text not null, faculty text not null default '', conducted integer not null default 0 check (conducted >= 0), attended integer not null default 0 check (attended >= 0 and attended <= conducted),
  unique(user_id, name), unique(user_id, code)
);

create table if not exists public.timetable_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  day text not null check (day in ('MON','TUE','WED','THU','FRI')), start_time time not null, end_time time not null, course_id uuid not null references public.courses(id) on delete cascade, room text not null default '', check (start_time < end_time)
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, course_id uuid not null references public.courses(id) on delete cascade, entry_id uuid references public.timetable_entries(id) on delete cascade, status text not null check (status in ('attended','missed')), unique(user_id, date, entry_id)
);

alter table public.profiles enable row level security;
alter table public.semesters enable row level security;
alter table public.courses enable row level security;
alter table public.timetable_entries enable row level security;
alter table public.attendance_records enable row level security;

drop policy if exists "Users manage own profiles" on public.profiles;
create policy "Users manage own profiles" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "Users manage own semesters" on public.semesters;
create policy "Users manage own semesters" on public.semesters for all using (user_id = auth.uid()) with check (user_id = auth.uid());
do $$ declare table_name text; begin foreach table_name in array array['courses','timetable_entries','attendance_records'] loop execute format('drop policy if exists "Users manage own %s" on public.%s', table_name, table_name); execute format('create policy "Users manage own %s" on public.%s for all using (user_id = auth.uid()) with check (user_id = auth.uid())', table_name, table_name); end loop; end $$;

create index if not exists courses_user_id_idx on public.courses(user_id);
create index if not exists semesters_user_id_idx on public.semesters(user_id);
create index if not exists timetable_user_id_idx on public.timetable_entries(user_id);
create index if not exists attendance_user_date_idx on public.attendance_records(user_id, date);
