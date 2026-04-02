-- 1) Recipes: publish flag
alter table public.recipes
  add column if not exists is_published boolean default false;

-- 2) Roles
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('chef', 'consumer')),
  created_at timestamptz default now()
);

alter table public.user_roles enable row level security;

drop policy if exists "user_roles_select_own" on public.user_roles;
create policy "user_roles_select_own"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.user_roles to authenticated;

-- 3) Invite codes
create table if not exists public.invite_codes (
  id bigint generated always as identity primary key,
  chef_id uuid references auth.users (id) on delete cascade,
  code text unique not null,
  max_uses int default 1,
  uses_count int default 0,
  expires_at timestamptz,
  created_at timestamptz default now()
);

alter table public.invite_codes enable row level security;

drop policy if exists "invite_codes_owner_select" on public.invite_codes;
create policy "invite_codes_owner_select"
  on public.invite_codes
  for select
  to authenticated
  using (chef_id = auth.uid());

drop policy if exists "invite_codes_owner_insert" on public.invite_codes;
create policy "invite_codes_owner_insert"
  on public.invite_codes
  for insert
  to authenticated
  with check (chef_id = auth.uid());

drop policy if exists "invite_codes_owner_update" on public.invite_codes;
create policy "invite_codes_owner_update"
  on public.invite_codes
  for update
  to authenticated
  using (chef_id = auth.uid())
  with check (chef_id = auth.uid());

drop policy if exists "invite_codes_owner_delete" on public.invite_codes;
create policy "invite_codes_owner_delete"
  on public.invite_codes
  for delete
  to authenticated
  using (chef_id = auth.uid());

drop policy if exists "invite_codes_anon_validate" on public.invite_codes;
create policy "invite_codes_anon_validate"
  on public.invite_codes
  for select
  to anon
  using (
    uses_count < max_uses
    and (expires_at is null or expires_at > now())
  );

grant select on public.invite_codes to anon, authenticated;
grant insert, update, delete on public.invite_codes to authenticated;

-- 4) Chef <> Consumer mapping
create table if not exists public.chef_consumers (
  id bigint generated always as identity primary key,
  chef_id uuid references auth.users (id) on delete cascade,
  consumer_id uuid references auth.users (id) on delete cascade,
  invite_code_id bigint references public.invite_codes (id),
  created_at timestamptz default now(),
  unique (chef_id, consumer_id)
);

alter table public.chef_consumers enable row level security;

drop policy if exists "chef_consumers_chef_select" on public.chef_consumers;
create policy "chef_consumers_chef_select"
  on public.chef_consumers
  for select
  to authenticated
  using (chef_id = auth.uid());

drop policy if exists "chef_consumers_consumer_select" on public.chef_consumers;
create policy "chef_consumers_consumer_select"
  on public.chef_consumers
  for select
  to authenticated
  using (consumer_id = auth.uid());

grant select on public.chef_consumers to authenticated;

-- 5) Consumer profile
create table if not exists public.consumer_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  allergies jsonb default '[]'::jsonb,
  notes text,
  created_at timestamptz default now()
);

alter table public.consumer_profiles enable row level security;

drop policy if exists "consumer_profiles_select_own" on public.consumer_profiles;
create policy "consumer_profiles_select_own"
  on public.consumer_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "consumer_profiles_update_own" on public.consumer_profiles;
create policy "consumer_profiles_update_own"
  on public.consumer_profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "consumer_profiles_insert_own" on public.consumer_profiles;
create policy "consumer_profiles_insert_own"
  on public.consumer_profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "consumer_profiles_chef_select" on public.consumer_profiles;
create policy "consumer_profiles_chef_select"
  on public.consumer_profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.chef_consumers cc
      where cc.chef_id = auth.uid()
        and cc.consumer_id = consumer_profiles.user_id
    )
  );

grant select, insert, update on public.consumer_profiles to authenticated;

-- 6) RPC to redeem invitation
create or replace function public.redeem_invite_code(p_code text, p_consumer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.invite_codes;
begin
  select *
  into v_code
  from public.invite_codes
  where code = upper(trim(p_code))
    and uses_count < max_uses
    and (expires_at is null or expires_at > now())
  for update;

  if not found then
    raise exception 'Código inválido o expirado';
  end if;

  insert into public.chef_consumers (chef_id, consumer_id, invite_code_id)
  values (v_code.chef_id, p_consumer_id, v_code.id);

  insert into public.user_roles (user_id, role)
  values (p_consumer_id, 'consumer')
  on conflict (user_id) do update set role = excluded.role;

  update public.invite_codes
  set uses_count = uses_count + 1
  where id = v_code.id;

  insert into public.consumer_profiles (user_id)
  values (p_consumer_id)
  on conflict (user_id) do nothing;

  return v_code.chef_id;
end;
$$;

grant execute on function public.redeem_invite_code(text, uuid) to authenticated;
