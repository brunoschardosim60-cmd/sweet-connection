-- Commercial access is separate from authentication. Payment providers can
-- later update these fields via a server-side webhook.
alter table public.profiles
  add column if not exists subscription_tier text not null default 'none'
    check (subscription_tier in ('none', 'essential', 'professional', 'catalog')),
  add column if not exists subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive', 'active', 'past_due', 'cancelled'));

update public.profiles
set subscription_tier = case when plan::text = 'pro' then 'professional' else 'none' end,
    subscription_status = case when plan::text = 'pro' then 'active' else 'inactive' end
where subscription_tier = 'none' and subscription_status = 'inactive';

create table if not exists public.ai_generation_weekly_usage (
  owner_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  generations integer not null default 0 check (generations >= 0),
  updated_at timestamptz not null default now(),
  primary key (owner_id, week_start)
);
alter table public.ai_generation_weekly_usage enable row level security;
revoke all on public.ai_generation_weekly_usage from anon, authenticated;
grant all on public.ai_generation_weekly_usage to service_role;

create or replace function public.nexa_plan_allows_publish(requested_user_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select public.has_role(requested_user_id, 'admin') or exists (
    select 1 from public.profiles p where p.id = requested_user_id
      and p.subscription_status = 'active' and p.subscription_tier <> 'none'
  );
$$;

create or replace function public.nexa_consume_ai_generation(requested_user_id uuid)
returns table (allowed boolean, used integer, daily_limit integer)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare tier text; active boolean; current_count integer; monday date := date_trunc('week', current_date)::date;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'server_only' using errcode = '42501'; end if;
  if public.has_role(requested_user_id, 'admin') then return query select true, 0, null::integer; return; end if;
  select subscription_tier, subscription_status = 'active' into tier, active from public.profiles where id = requested_user_id;
  if not coalesce(active, false) or tier not in ('professional', 'catalog') then
    return query select false, 0, 1; return;
  end if;
  insert into public.ai_generation_weekly_usage(owner_id, week_start, generations) values(requested_user_id, monday, 1)
  on conflict(owner_id, week_start) do update set generations = public.ai_generation_weekly_usage.generations + 1, updated_at = now()
  where public.ai_generation_weekly_usage.generations < 1 returning generations into current_count;
  if current_count is null then
    return query select false, 1, 1;
  end if;
  insert into public.ai_generation_daily_usage(owner_id, usage_date, generations) values(requested_user_id, current_date, 1)
  on conflict(owner_id, usage_date) do update set generations = public.ai_generation_daily_usage.generations + 1, updated_at = now();
  return query select true, current_count, 1;
end; $$;

create or replace function public.nexa_refund_ai_generation(requested_user_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'server_only' using errcode = '42501'; end if;
  update public.ai_generation_weekly_usage set generations=greatest(generations-1,0), updated_at=now()
    where owner_id=requested_user_id and week_start=date_trunc('week', current_date)::date;
  update public.ai_generation_daily_usage set generations=greatest(generations-1,0), updated_at=now()
    where owner_id=requested_user_id and usage_date=current_date;
end; $$;

create or replace function public.publish_minisite(requested_id uuid)
returns public.minisites language plpgsql set search_path = pg_catalog, public as $$
declare saved public.minisites; caller uuid := auth.uid(); site_limit integer;
begin
  if caller is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if not public.nexa_plan_allows_publish(caller) then raise exception 'subscription_required' using errcode = '42501'; end if;
  select case subscription_tier when 'essential' then 1 else 3 end into site_limit from public.profiles where id = caller;
  if not public.has_role(caller, 'admin') and (select count(*) from public.minisites where owner_id = caller and status = 'publicado' and id <> requested_id) >= coalesce(site_limit, 0) then
    raise exception 'published_site_limit_reached' using errcode = '42501';
  end if;
  update public.minisites set status = 'publicado', published_content = draft_content || jsonb_build_object('status','publicado','expiraEm',expires_at), published_at = now()
  where id = requested_id and owner_id = caller and (expires_at is null or expires_at > now()) returning * into saved;
  if saved.id is null then raise exception 'minisite_not_found_or_expired' using errcode = 'P0002'; end if;
  return saved;
end; $$;

create or replace function public.nexa_admin_ai_usage(requested_days integer default 30)
returns table(user_id uuid, email text, tier text, subscription_status text, generations_7d bigint, generations_30d bigint, last_generation_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'admin_required' using errcode = '42501'; end if;
  return query select p.id, u.email, p.subscription_tier, p.subscription_status,
    coalesce((select sum(d.generations) from public.ai_generation_daily_usage d where d.owner_id=p.id and d.usage_date >= current_date-6),0),
    coalesce((select sum(d.generations) from public.ai_generation_daily_usage d where d.owner_id=p.id and d.usage_date >= current_date-(greatest(1, least(requested_days, 90))-1)),0),
    (select max(d.updated_at) from public.ai_generation_daily_usage d where d.owner_id=p.id)
  from public.profiles p join auth.users u on u.id=p.id order by 6 desc, 7 desc nulls last;
end; $$;

revoke all on function public.nexa_plan_allows_publish(uuid) from public;
grant execute on function public.nexa_plan_allows_publish(uuid) to authenticated, service_role;
revoke all on function public.nexa_admin_ai_usage(integer) from public;
grant execute on function public.nexa_admin_ai_usage(integer) to authenticated;
