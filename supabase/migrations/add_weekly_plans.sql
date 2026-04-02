create table if not exists public.weekly_plans (
  id bigint generated always as identity primary key,
  consumer_id uuid references auth.users (id) on delete cascade,
  chef_id uuid references auth.users (id),
  week_start date not null,
  created_at timestamptz default now(),
  unique (consumer_id, week_start)
);

alter table public.weekly_plans enable row level security;

drop policy if exists "weekly_plans_consumer_select" on public.weekly_plans;
create policy "weekly_plans_consumer_select"
  on public.weekly_plans
  for select
  to authenticated
  using (consumer_id = auth.uid());

drop policy if exists "weekly_plans_consumer_insert" on public.weekly_plans;
create policy "weekly_plans_consumer_insert"
  on public.weekly_plans
  for insert
  to authenticated
  with check (consumer_id = auth.uid());

drop policy if exists "weekly_plans_consumer_update" on public.weekly_plans;
create policy "weekly_plans_consumer_update"
  on public.weekly_plans
  for update
  to authenticated
  using (consumer_id = auth.uid())
  with check (consumer_id = auth.uid());

drop policy if exists "weekly_plans_consumer_delete" on public.weekly_plans;
create policy "weekly_plans_consumer_delete"
  on public.weekly_plans
  for delete
  to authenticated
  using (consumer_id = auth.uid());

drop policy if exists "weekly_plans_chef_select" on public.weekly_plans;
create policy "weekly_plans_chef_select"
  on public.weekly_plans
  for select
  to authenticated
  using (chef_id = auth.uid());

grant select, insert, update, delete on public.weekly_plans to authenticated;

create table if not exists public.plan_items (
  id bigint generated always as identity primary key,
  plan_id bigint references public.weekly_plans (id) on delete cascade,
  recipe_id bigint references public.recipes (id) on delete cascade,
  servings int default 1,
  days jsonb default '[]'::jsonb,
  notes text,
  created_at timestamptz default now()
);

alter table public.plan_items enable row level security;

drop policy if exists "plan_items_consumer_select" on public.plan_items;
create policy "plan_items_consumer_select"
  on public.plan_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.weekly_plans wp
      where wp.id = plan_items.plan_id
        and wp.consumer_id = auth.uid()
    )
  );

drop policy if exists "plan_items_consumer_insert" on public.plan_items;
create policy "plan_items_consumer_insert"
  on public.plan_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.weekly_plans wp
      where wp.id = plan_items.plan_id
        and wp.consumer_id = auth.uid()
    )
  );

drop policy if exists "plan_items_consumer_update" on public.plan_items;
create policy "plan_items_consumer_update"
  on public.plan_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.weekly_plans wp
      where wp.id = plan_items.plan_id
        and wp.consumer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.weekly_plans wp
      where wp.id = plan_items.plan_id
        and wp.consumer_id = auth.uid()
    )
  );

drop policy if exists "plan_items_consumer_delete" on public.plan_items;
create policy "plan_items_consumer_delete"
  on public.plan_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.weekly_plans wp
      where wp.id = plan_items.plan_id
        and wp.consumer_id = auth.uid()
    )
  );

drop policy if exists "plan_items_chef_select" on public.plan_items;
create policy "plan_items_chef_select"
  on public.plan_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.weekly_plans wp
      where wp.id = plan_items.plan_id
        and wp.chef_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.plan_items to authenticated;
