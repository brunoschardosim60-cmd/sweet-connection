-- Keep the RPC result columns exactly aligned with their declared TABLE types.
-- PostgREST executes these functions directly for the admin dashboard, so implicit
-- type changes in aggregates or profile columns must never break the whole panel.

create or replace function public.nexa_admin_ai_usage(requested_days integer default 30)
returns table(
  user_id uuid, email text, tier text, subscription_status text,
  generations_7d bigint, generations_period bigint,
  tokens_7d bigint, tokens_period bigint,
  estimated_cost_brl_period numeric, last_generation_at timestamptz
)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare days integer := greatest(1, least(requested_days, 90));
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  return query
  select
    p.id::uuid,
    u.email::text,
    p.subscription_tier::text,
    p.subscription_status::text,
    coalesce((select count(*) from public.ai_generation_events e
      where e.owner_id = p.id and e.created_at >= now() - interval '7 days'), 0)::bigint,
    coalesce((select count(*) from public.ai_generation_events e
      where e.owner_id = p.id and e.created_at >= now() - make_interval(days => days)), 0)::bigint,
    coalesce((select sum(e.total_tokens) from public.ai_generation_events e
      where e.owner_id = p.id and e.created_at >= now() - interval '7 days'), 0)::bigint,
    coalesce((select sum(e.total_tokens) from public.ai_generation_events e
      where e.owner_id = p.id and e.created_at >= now() - make_interval(days => days)), 0)::bigint,
    coalesce((select sum(e.estimated_cost_brl) from public.ai_generation_events e
      where e.owner_id = p.id and e.created_at >= now() - make_interval(days => days)), 0)::numeric,
    (select max(e.created_at) from public.ai_generation_events e where e.owner_id = p.id)::timestamptz
  from public.profiles p
  join auth.users u on u.id = p.id
  order by 8 desc, 6 desc, 10 desc nulls last;
end;
$$;

create or replace function public.nexa_admin_finance(requested_days integer default 30)
returns table(
  revenue_received_brl numeric,
  revenue_pending_brl numeric,
  revenue_overdue_brl numeric,
  active_subscriptions bigint,
  paid_invoices bigint,
  ai_tokens bigint,
  ai_generations bigint,
  ai_estimated_cost_brl numeric
)
language plpgsql security definer set search_path = pg_catalog, public as $$
declare days integer := greatest(1, least(requested_days, 90));
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  return query select
    coalesce((select sum(i.amount) from public.billing_invoices i
      where i.status in ('RECEIVED', 'CONFIRMED') and i.paid_at >= now() - make_interval(days => days)), 0)::numeric,
    coalesce((select sum(i.amount) from public.billing_invoices i
      where i.status in ('PENDING', 'AWAITING_PAYMENT', 'AWAITING_RISK_ANALYSIS') and i.created_at >= now() - make_interval(days => days)), 0)::numeric,
    coalesce((select sum(i.amount) from public.billing_invoices i
      where i.status = 'OVERDUE' and i.created_at >= now() - make_interval(days => days)), 0)::numeric,
    (select count(*) from public.profiles p
      where p.subscription_status = 'active' and p.subscription_tier <> 'none')::bigint,
    (select count(*) from public.billing_invoices i
      where i.status in ('RECEIVED', 'CONFIRMED') and i.paid_at >= now() - make_interval(days => days))::bigint,
    coalesce((select sum(e.total_tokens) from public.ai_generation_events e
      where e.created_at >= now() - make_interval(days => days)), 0)::bigint,
    (select count(*) from public.ai_generation_events e
      where e.created_at >= now() - make_interval(days => days))::bigint,
    coalesce((select sum(e.estimated_cost_brl) from public.ai_generation_events e
      where e.created_at >= now() - make_interval(days => days)), 0)::numeric;
end;
$$;

revoke all on function public.nexa_admin_ai_usage(integer) from public;
grant execute on function public.nexa_admin_ai_usage(integer) to authenticated;
revoke all on function public.nexa_admin_finance(integer) from public;
grant execute on function public.nexa_admin_finance(integer) to authenticated;
