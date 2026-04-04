-- RPC para registrar un chef (security definer para bypassear RLS en user_roles)
create or replace function public.register_chef()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (auth.uid(), 'chef')
  on conflict (user_id) do nothing;
end;
$$;

grant execute on function public.register_chef() to authenticated;
