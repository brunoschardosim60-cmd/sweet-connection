-- Separate commercial plans from administrative authorization and remove the
-- e-mail based admin backdoor introduced by the previous migration.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'nexa_plan') then
    create type public.nexa_plan as enum ('free', 'pro');
  end if;
end $$;

alter table public.profiles
  add column if not exists plan public.nexa_plan not null default 'free',
  add column if not exists plan_updated_at timestamptz not null default now(),
  add column if not exists plan_changed_by uuid references auth.users(id) on delete set null;

-- Preserve plans already assigned by Lovable before removing them from the
-- authorization table.
update public.profiles p
set plan = case
    when exists (
      select 1 from public.user_roles r
      where r.user_id = p.id and r.role = 'pro'
    ) then 'pro'::public.nexa_plan
    else 'free'::public.nexa_plan
  end,
  plan_updated_at = now()
where exists (
  select 1 from public.user_roles r
  where r.user_id = p.id and r.role in ('pro', 'free')
);

delete from public.user_roles where role in ('pro', 'free');

alter table public.user_roles
  drop constraint if exists user_roles_admin_only;
alter table public.user_roles
  add constraint user_roles_admin_only check (role = 'admin');

-- Bootstrap only an account that already exists at migration time. New
-- accounts never become administrators based on a claimed e-mail address.
insert into public.user_roles (user_id, role, granted_by)
select id, 'admin'::public.app_role, id
from auth.users
where lower(email) = 'admnexa@gmail.com'
on conflict (user_id, role) do nothing;

create or replace function public.handle_new_nexa_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, display_name, role, plan)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 120),
    'owner',
    'free'::public.nexa_plan
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Plans and admin authorization are security-sensitive. Profile owners may
-- continue editing their profile, but may not upgrade their own plan.
create or replace function public.protect_nexa_managed_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.plan is distinct from old.plan
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'managed_plan' using errcode = '42501';
  end if;

  if new.plan is distinct from old.plan then
    new.plan_updated_at = now();
    new.plan_changed_by = auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists protect_nexa_managed_profile_fields on public.profiles;
create trigger protect_nexa_managed_profile_fields
  before update on public.profiles
  for each row execute function public.protect_nexa_managed_profile_fields();

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('plan_changed')),
  previous_value text,
  new_value text,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

drop policy if exists admin_audit_read on public.admin_audit_log;
create policy admin_audit_read on public.admin_audit_log
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Only SECURITY DEFINER routines and service_role may mutate authorization and
-- audit data. No browser client receives direct write privileges.
drop policy if exists user_roles_admin_write on public.user_roles;
revoke insert, update, delete on public.user_roles from anon, authenticated;
revoke insert, update, delete on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;
grant all on public.admin_audit_log to service_role;

create or replace function public.nexa_admin_set_plan(
  requested_user_id uuid,
  requested_plan text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  previous_plan public.nexa_plan;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if requested_plan not in ('pro', 'free') then
    raise exception 'invalid_plan' using errcode = '22023';
  end if;

  select plan into previous_plan
  from public.profiles
  where id = requested_user_id
  for update;

  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  if previous_plan::text = requested_plan then
    return;
  end if;

  update public.profiles
  set plan = requested_plan::public.nexa_plan,
      plan_updated_at = now(),
      plan_changed_by = auth.uid()
  where id = requested_user_id;

  insert into public.admin_audit_log (
    actor_user_id,
    target_user_id,
    action,
    previous_value,
    new_value
  ) values (
    auth.uid(),
    requested_user_id,
    'plan_changed',
    previous_plan::text,
    requested_plan
  );
end;
$$;

-- Administrative access is intentionally immutable through the public API.
-- It can only be restored or transferred by an explicit owner-run migration.
drop function if exists public.nexa_admin_set_role(uuid, text, boolean);

drop function if exists public.nexa_admin_users();
create or replace function public.nexa_admin_users()
returns table (
  user_id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  last_active_at timestamptz,
  deletion_scheduled_at timestamptz,
  plano text,
  plan_updated_at timestamptz,
  plan_changed_by uuid,
  is_admin boolean,
  sites integer,
  sites_publicados integer,
  solicitacoes integer,
  papeis jsonb
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.display_name,
    p.created_at,
    p.last_active_at,
    p.deletion_scheduled_at,
    p.plan::text,
    p.plan_updated_at,
    p.plan_changed_by,
    public.has_role(p.id, 'admin'),
    (select count(*)::int from public.minisites m where m.owner_id = p.id),
    (select count(*)::int from public.minisites m where m.owner_id = p.id and m.status = 'publicado'),
    (select count(*)::int from public.form_submissions f
       join public.minisites m2 on m2.id = f.minisite_id
       where m2.owner_id = p.id),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'role', r.role::text,
        'created_at', r.created_at,
        'updated_at', r.updated_at
      ) order by r.role)
      from public.user_roles r where r.user_id = p.id
    ), '[]'::jsonb)
  from public.profiles p
  left join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

create or replace function public.nexa_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  resultado jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'usuarios', (select count(*) from public.profiles),
    'usuarios_ativos_30d', (select count(*) from public.profiles where last_active_at > now() - interval '30 days'),
    'sites', (select count(*) from public.minisites),
    'sites_publicados', (select count(*) from public.minisites where status = 'publicado'),
    'clientes', (select count(*) from public.clients),
    'solicitacoes', (select count(*) from public.form_submissions),
    'solicitacoes_30d', (select count(*) from public.form_submissions where created_at > now() - interval '30 days'),
    'visitas_30d', (select count(*) from public.analytics_events where event_type = 'visita' and occurred_at > now() - interval '30 days'),
    'planos', jsonb_build_object(
      'free', (select count(*) from public.profiles where plan = 'free'),
      'pro', (select count(*) from public.profiles where plan = 'pro')
    )
  ) into resultado;

  return resultado;
end;
$$;

create or replace function public.nexa_admin_audit(requested_limit integer default 100)
returns table (
  id bigint,
  actor_user_id uuid,
  actor_email text,
  target_user_id uuid,
  target_email text,
  action text,
  previous_value text,
  new_value text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  return query
  select
    l.id,
    l.actor_user_id,
    actor.email::text,
    l.target_user_id,
    target.email::text,
    l.action,
    l.previous_value,
    l.new_value,
    l.created_at
  from public.admin_audit_log l
  left join auth.users actor on actor.id = l.actor_user_id
  left join auth.users target on target.id = l.target_user_id
  order by l.created_at desc
  limit least(greatest(coalesce(requested_limit, 100), 1), 500);
end;
$$;

revoke all on function public.nexa_admin_overview() from public, anon;
revoke all on function public.nexa_admin_users() from public, anon;
revoke all on function public.nexa_admin_series(integer) from public, anon;
revoke all on function public.nexa_admin_set_plan(uuid, text) from public, anon;
revoke all on function public.nexa_admin_audit(integer) from public, anon;

grant execute on function public.nexa_admin_overview() to authenticated;
grant execute on function public.nexa_admin_users() to authenticated;
grant execute on function public.nexa_admin_series(integer) to authenticated;
grant execute on function public.nexa_admin_set_plan(uuid, text) to authenticated;
grant execute on function public.nexa_admin_audit(integer) to authenticated;
