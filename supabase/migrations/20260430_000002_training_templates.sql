-- IronLore: Training templates + exercise catalog
-- Run this SQL in Supabase SQL editor (or via Supabase CLI migrations).

-- ============================================================
-- exercise_catalog
-- ============================================================

create table if not exists public.exercise_catalog (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists exercise_catalog_unique_user_lower_name
  on public.exercise_catalog (user_id, lower(name));

-- ============================================================
-- workout_templates
-- ============================================================

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- workout_template_items
-- ============================================================

create table if not exists public.workout_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercise_catalog(id) on delete restrict,
  position int not null,
  sets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workout_template_items_template_pos
  on public.workout_template_items (template_id, position);

-- ============================================================
-- updated_at trigger for workout_templates
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workout_templates_set_updated_at on public.workout_templates;
create trigger workout_templates_set_updated_at
before update on public.workout_templates
for each row execute function public.set_updated_at();

-- ============================================================
-- RLS: exercise_catalog
-- ============================================================

alter table public.exercise_catalog enable row level security;

drop policy if exists exercise_catalog_select_owner on public.exercise_catalog;
create policy exercise_catalog_select_owner
  on public.exercise_catalog
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists exercise_catalog_insert_owner on public.exercise_catalog;
create policy exercise_catalog_insert_owner
  on public.exercise_catalog
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists exercise_catalog_update_owner on public.exercise_catalog;
create policy exercise_catalog_update_owner
  on public.exercise_catalog
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists exercise_catalog_delete_owner on public.exercise_catalog;
create policy exercise_catalog_delete_owner
  on public.exercise_catalog
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- RLS: workout_templates
-- ============================================================

alter table public.workout_templates enable row level security;

drop policy if exists workout_templates_select_owner on public.workout_templates;
create policy workout_templates_select_owner
  on public.workout_templates
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists workout_templates_insert_owner on public.workout_templates;
create policy workout_templates_insert_owner
  on public.workout_templates
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists workout_templates_update_owner on public.workout_templates;
create policy workout_templates_update_owner
  on public.workout_templates
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists workout_templates_delete_owner on public.workout_templates;
create policy workout_templates_delete_owner
  on public.workout_templates
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- RLS: workout_template_items
-- ============================================================

alter table public.workout_template_items enable row level security;

drop policy if exists workout_template_items_select_owner on public.workout_template_items;
create policy workout_template_items_select_owner
  on public.workout_template_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workout_templates t
      where t.id = workout_template_items.template_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists workout_template_items_insert_owner on public.workout_template_items;
create policy workout_template_items_insert_owner
  on public.workout_template_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.workout_templates t
      where t.id = workout_template_items.template_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists workout_template_items_update_owner on public.workout_template_items;
create policy workout_template_items_update_owner
  on public.workout_template_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.workout_templates t
      where t.id = workout_template_items.template_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workout_templates t
      where t.id = workout_template_items.template_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists workout_template_items_delete_owner on public.workout_template_items;
create policy workout_template_items_delete_owner
  on public.workout_template_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.workout_templates t
      where t.id = workout_template_items.template_id
        and t.user_id = auth.uid()
    )
  );

