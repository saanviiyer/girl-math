-- Girl Math — initial schema
-- Multi-user cloud persistence. Every table is keyed by user_id and locked down
-- with Row Level Security so a user can only ever read/write their own rows.

-- ---------------------------------------------------------------------------
-- profiles: one row per user (mirrors auth.users, holds app-facing profile bits)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- budget_settings: one row per user (daily budget, currency, start date, etc.)
-- ---------------------------------------------------------------------------
create table if not exists public.budget_settings (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  daily_budget numeric(12, 2) not null default 30 check (daily_budget >= 0),
  currency     text not null default 'USD',
  start_date   date not null default current_date,
  onboarded    boolean not null default false,
  budget_history jsonb not null default '[]'::jsonb,
  updated_at   timestamptz not null default now()
);

alter table public.budget_settings enable row level security;

create policy "budget_settings_select_own" on public.budget_settings
  for select using (auth.uid() = user_id);
create policy "budget_settings_insert_own" on public.budget_settings
  for insert with check (auth.uid() = user_id);
create policy "budget_settings_update_own" on public.budget_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budget_settings_delete_own" on public.budget_settings
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- spending_entries: many rows per user (each logged spend)
-- ---------------------------------------------------------------------------
create table if not exists public.spending_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null,
  amount     numeric(12, 2) not null check (amount >= 0),
  note       text,
  category   text,
  created_at timestamptz not null default now()
);

alter table public.spending_entries enable row level security;

create policy "spending_entries_select_own" on public.spending_entries
  for select using (auth.uid() = user_id);
create policy "spending_entries_insert_own" on public.spending_entries
  for insert with check (auth.uid() = user_id);
create policy "spending_entries_update_own" on public.spending_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "spending_entries_delete_own" on public.spending_entries
  for delete using (auth.uid() = user_id);

-- Fast per-user, per-day lookups (spentOn / history / charts filter by user + date).
create index if not exists spending_entries_user_date_idx
  on public.spending_entries (user_id, date);

-- ---------------------------------------------------------------------------
-- Auto-provision a profile row when a new auth user is created.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
