-- 1. Enum de papéis
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'pro', 'free');
  end if;
end $$;

-- 2. Tabela de papéis
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'free',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

-- 3. Função de verificação de papel
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

drop policy if exists user_roles_read_self on public.user_roles;
create policy user_roles_read_self on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists user_roles_admin_write on public.user_roles;
create policy user_roles_admin_write on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 4. Leitura administrativa nas tabelas existentes
drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_admin_read on public.profiles
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists clients_admin_read on public.clients;
create policy clients_admin_read on public.clients
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists minisites_admin_read on public.minisites;
create policy minisites_admin_read on public.minisites
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists submissions_admin_read on public.form_submissions;
create policy submissions_admin_read on public.form_submissions
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists analytics_admin_read on public.analytics_events;
create policy analytics_admin_read on public.analytics_events
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- 5. Resumo da plataforma
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
    'planos', (
      select coalesce(jsonb_object_agg(role, total), '{}'::jsonb)
      from (
        select role::text as role, count(*) as total
        from public.user_roles group by role
      ) t
    )
  ) into resultado;

  return resultado;
end;
$$;

-- 6. Lista de usuários para o admin
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
  solicitacoes integer
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
       where m2.owner_id = p.id)
  from public.profiles p
  left join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

-- 7. Alterar plano de um usuário
create or replace function public.nexa_admin_set_plan(requested_user_id uuid, requested_plan text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if requested_plan not in ('pro', 'free') then
    raise exception 'invalid_plan' using errcode = '22023';
  end if;

  delete from public.user_roles
  where user_id = requested_user_id and role in ('pro', 'free');

  insert into public.user_roles (user_id, role)
  values (requested_user_id, requested_plan::public.app_role)
  on conflict (user_id, role) do nothing;
end;
$$;

-- 8. Semear o administrador
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role from auth.users where lower(email) = 'admnexa@gmail.com'
on conflict (user_id, role) do nothing;