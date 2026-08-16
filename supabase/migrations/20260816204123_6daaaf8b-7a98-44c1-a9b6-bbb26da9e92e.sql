alter table public.user_roles
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists granted_by uuid;

drop trigger if exists user_roles_updated_at on public.user_roles;
create trigger user_roles_updated_at
  before update on public.user_roles
  for each row execute function public.set_updated_at();

-- Conceder/remover papéis com registro de data e autor
create or replace function public.nexa_admin_set_role(
  requested_user_id uuid,
  requested_role text,
  requested_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if requested_role not in ('admin', 'pro', 'free') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;

  if requested_role = 'admin'
     and requested_enabled = false
     and requested_user_id = auth.uid() then
    raise exception 'cannot_remove_own_admin' using errcode = '22023';
  end if;

  if requested_enabled then
    if requested_role in ('pro', 'free') then
      delete from public.user_roles
      where user_id = requested_user_id and role in ('pro', 'free')
        and role::text <> requested_role;
    end if;

    insert into public.user_roles (user_id, role, granted_by)
    values (requested_user_id, requested_role::public.app_role, auth.uid())
    on conflict (user_id, role)
      do update set updated_at = now(), granted_by = auth.uid();
  else
    delete from public.user_roles
    where user_id = requested_user_id and role = requested_role::public.app_role;
  end if;
end;
$$;

-- Lista de usuários com papéis detalhados
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
    coalesce(
      (select r.role::text from public.user_roles r
        where r.user_id = p.id and r.role in ('pro','free')
        order by (r.role = 'pro') desc limit 1),
      'free'
    ),
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

-- Série histórica por período
create or replace function public.nexa_admin_series(requested_days integer default 30)
returns table (
  dia date,
  usuarios integer,
  sites integer,
  solicitacoes integer,
  visitas integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  janela integer := least(greatest(coalesce(requested_days, 30), 1), 365);
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  return query
  with dias as (
    select generate_series(
      (current_date - (janela - 1)),
      current_date,
      interval '1 day'
    )::date as dia
  )
  select
    d.dia,
    (select count(*)::int from public.profiles p where p.created_at::date = d.dia),
    (select count(*)::int from public.minisites m where m.created_at::date = d.dia),
    (select count(*)::int from public.form_submissions f where f.created_at::date = d.dia),
    (select count(*)::int from public.analytics_events e
      where e.event_type = 'visita' and e.occurred_at::date = d.dia)
  from dias d
  order by d.dia;
end;
$$;