-- Registro imutável de cada geração concluída. A tabela não é exposta ao navegador.
create table if not exists public.ai_generation_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('gemini', 'lovable')),
  model text not null,
  prompt_tokens integer check (prompt_tokens is null or prompt_tokens >= 0),
  completion_tokens integer check (completion_tokens is null or completion_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  estimated_cost_brl numeric(12,6) not null default 0 check (estimated_cost_brl >= 0),
  created_at timestamptz not null default now()
);
create index if not exists ai_generation_events_owner_created_idx on public.ai_generation_events(owner_id, created_at desc);
alter table public.ai_generation_events enable row level security;
revoke all on public.ai_generation_events from anon, authenticated;
grant all on public.ai_generation_events to service_role;

create or replace function public.nexa_record_ai_generation(
  requested_user_id uuid,
  requested_provider text,
  requested_model text,
  requested_prompt_tokens integer,
  requested_completion_tokens integer,
  requested_total_tokens integer,
  requested_estimated_cost_brl numeric
) returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'server_only' using errcode = '42501';
  end if;
  insert into public.ai_generation_events(
    owner_id, provider, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_brl
  ) values (
    requested_user_id, requested_provider, requested_model,
    greatest(coalesce(requested_prompt_tokens, 0), 0),
    greatest(coalesce(requested_completion_tokens, 0), 0),
    greatest(coalesce(requested_total_tokens, 0), 0),
    greatest(coalesce(requested_estimated_cost_brl, 0), 0)
  );
end;
$$;
revoke all on function public.nexa_record_ai_generation(uuid, text, text, integer, integer, integer, numeric) from public, anon, authenticated;
grant execute on function public.nexa_record_ai_generation(uuid, text, text, integer, integer, integer, numeric) to service_role;

drop function if exists public.nexa_admin_ai_usage(integer);
create function public.nexa_admin_ai_usage(requested_days integer default 30)
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
  select p.id, u.email, p.subscription_tier, p.subscription_status,
    coalesce((select count(*) from public.ai_generation_events e where e.owner_id=p.id and e.created_at >= now() - interval '7 days'), 0),
    coalesce((select count(*) from public.ai_generation_events e where e.owner_id=p.id and e.created_at >= now() - make_interval(days => days)), 0),
    coalesce((select sum(e.total_tokens) from public.ai_generation_events e where e.owner_id=p.id and e.created_at >= now() - interval '7 days'), 0),
    coalesce((select sum(e.total_tokens) from public.ai_generation_events e where e.owner_id=p.id and e.created_at >= now() - make_interval(days => days)), 0),
    coalesce((select sum(e.estimated_cost_brl) from public.ai_generation_events e where e.owner_id=p.id and e.created_at >= now() - make_interval(days => days)), 0),
    (select max(e.created_at) from public.ai_generation_events e where e.owner_id=p.id)
  from public.profiles p join auth.users u on u.id=p.id
  order by 8 desc, 6 desc, 10 desc nulls last;
end;
$$;
revoke all on function public.nexa_admin_ai_usage(integer) from public;
grant execute on function public.nexa_admin_ai_usage(integer) to authenticated;

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
    coalesce((select sum(i.amount) from public.billing_invoices i where i.status in ('RECEIVED','CONFIRMED') and i.paid_at >= now() - make_interval(days => days)), 0),
    coalesce((select sum(i.amount) from public.billing_invoices i where i.status in ('PENDING','AWAITING_PAYMENT','AWAITING_RISK_ANALYSIS') and i.created_at >= now() - make_interval(days => days)), 0),
    coalesce((select sum(i.amount) from public.billing_invoices i where i.status = 'OVERDUE' and i.created_at >= now() - make_interval(days => days)), 0),
    (select count(*) from public.profiles p where p.subscription_status = 'active' and p.subscription_tier <> 'none'),
    (select count(*) from public.billing_invoices i where i.status in ('RECEIVED','CONFIRMED') and i.paid_at >= now() - make_interval(days => days)),
    coalesce((select sum(e.total_tokens) from public.ai_generation_events e where e.created_at >= now() - make_interval(days => days)), 0),
    (select count(*) from public.ai_generation_events e where e.created_at >= now() - make_interval(days => days)),
    coalesce((select sum(e.estimated_cost_brl) from public.ai_generation_events e where e.created_at >= now() - make_interval(days => days)), 0);
end;
$$;
revoke all on function public.nexa_admin_finance(integer) from public;
grant execute on function public.nexa_admin_finance(integer) to authenticated;
