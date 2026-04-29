-- IronLore: Social friends MVP (friends-only default)
-- Run this SQL in Supabase SQL editor (or via Supabase CLI migrations).

-- ============================================================
-- Profiles: handle + privacy
-- ============================================================

alter table if exists public.profiles
  add column if not exists handle text;

alter table if exists public.profiles
  add column if not exists privacy_workouts text not null default 'friends';

-- Ensure handle is unique (case-insensitive)
create unique index if not exists profiles_handle_unique_lower
  on public.profiles (lower(handle))
  where handle is not null;

-- Ensure privacy values constrained
alter table if exists public.profiles
  drop constraint if exists profiles_privacy_workouts_check;

alter table if exists public.profiles
  add constraint profiles_privacy_workouts_check
  check (privacy_workouts in ('private', 'friends', 'public'));

-- ============================================================
-- friend_requests
-- ============================================================

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.friend_requests
  drop constraint if exists friend_requests_status_check;

alter table public.friend_requests
  add constraint friend_requests_status_check
  check (status in ('pending', 'accepted', 'declined', 'cancelled'));

create unique index if not exists friend_requests_unique_pair
  on public.friend_requests (from_user_id, to_user_id);

-- ============================================================
-- friends (materialized bidirectional edges)
-- ============================================================

create table if not exists public.friends (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_user_id)
);

-- ============================================================
-- RLS: friend_requests
-- ============================================================

alter table public.friend_requests enable row level security;

drop policy if exists friend_requests_select_self on public.friend_requests;
create policy friend_requests_select_self
  on public.friend_requests
  for select
  to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists friend_requests_insert_self on public.friend_requests;
create policy friend_requests_insert_self
  on public.friend_requests
  for insert
  to authenticated
  with check (auth.uid() = from_user_id and from_user_id <> to_user_id);

drop policy if exists friend_requests_update_self on public.friend_requests;
create policy friend_requests_update_self
  on public.friend_requests
  for update
  to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id)
  with check (
    -- requester can cancel a pending request
    (auth.uid() = from_user_id and status in ('cancelled', 'pending'))
    -- recipient can accept/decline a pending request
    or (auth.uid() = to_user_id and status in ('accepted', 'declined', 'pending'))
  );

-- ============================================================
-- RLS: friends
-- ============================================================

alter table public.friends enable row level security;

drop policy if exists friends_select_owner on public.friends;
create policy friends_select_owner
  on public.friends
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists friends_insert_owner on public.friends;
create policy friends_insert_owner
  on public.friends
  for insert
  to authenticated
  with check (auth.uid() = user_id and user_id <> friend_user_id);

drop policy if exists friends_delete_owner on public.friends;
create policy friends_delete_owner
  on public.friends
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- RLS: workouts visibility (friends-only default)
-- ============================================================

-- Assumes you already have an owner-only select policy for workouts.
-- We add a policy that allows select if:
-- - owner's privacy_workouts is 'public', OR
-- - privacy_workouts is 'friends' AND requester is in friends edges.

alter table if exists public.workouts enable row level security;

drop policy if exists workouts_select_friends_or_public on public.workouts;
create policy workouts_select_friends_or_public
  on public.workouts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = workouts.user_id
        and (
          p.privacy_workouts = 'public'
          or (
            p.privacy_workouts = 'friends'
            and exists (
              select 1
              from public.friends f
              where f.user_id = workouts.user_id
                and f.friend_user_id = auth.uid()
            )
          )
        )
    )
  );

