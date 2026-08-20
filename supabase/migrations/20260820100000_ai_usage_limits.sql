-- Server-enforced daily allowance for new AI generations.
-- Cache hits do not call these routines and therefore never use an allowance.

create table if not exists public.ai_generation_daily_usage (
  owner_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  generations integer not null default 0 check (generations >= 0),
  updated_at timestamptz not null default now(),
  primary key (owner_id, usage_date)
);

alter table public.ai_generation_daily_usage enable row level security;
revoke all on public.ai_generation_daily_usage from anon, authenticated;
grant all on public.ai_generation_daily_usage to service_role;

-- This routine is deliberately service-role-only. The application server first
-- validates the caller's Supabase access token, then spends one generation for
-- that exact user. A browser cannot call this function to alter any quota.
create or replace function public.nexa_consume_ai_generation(requested_user_id uuid)
returns table (allowed boolean, used integer, daily_limit integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  plan public.nexa_plan;
  limit_for_plan integer;
  current_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'server_only' using errcode = '42501';
  end if;

  if requested_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if public.has_role(requested_user_id, 'admin') then
    return query select true, 0, null::integer;
    return;
  end if;

  select p.plan into plan from public.profiles p where p.id = requested_user_id;
  limit_for_plan := case coalesce(plan::text, 'free') when 'pro' then 20 else 5 end;

  insert into public.ai_generation_daily_usage (owner_id, usage_date, generations)
  values (requested_user_id, current_date, 1)
  on conflict (owner_id, usage_date) do update
  set generations = public.ai_generation_daily_usage.generations + 1,
      updated_at = now()
  where public.ai_generation_daily_usage.generations < limit_for_plan
  returning generations into current_count;

  if current_count is null then
    select coalesce(generations, 0) into current_count
    from public.ai_generation_daily_usage
    where owner_id = requested_user_id and usage_date = current_date;
    return query select false, current_count, limit_for_plan;
    return;
  end if;

  return query select true, current_count, limit_for_plan;
end;
$$;

create or replace function public.nexa_refund_ai_generation(requested_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'server_only' using errcode = '42501';
  end if;

  update public.ai_generation_daily_usage
  set generations = greatest(generations - 1, 0), updated_at = now()
  where owner_id = requested_user_id and usage_date = current_date;
end;
$$;

revoke all on function public.nexa_consume_ai_generation(uuid) from public, anon, authenticated;
revoke all on function public.nexa_refund_ai_generation(uuid) from public, anon, authenticated;
grant execute on function public.nexa_consume_ai_generation(uuid) to service_role;
grant execute on function public.nexa_refund_ai_generation(uuid) to service_role;
