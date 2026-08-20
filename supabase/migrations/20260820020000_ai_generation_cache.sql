-- Private, per-account cache for identical AI generation requests.
-- It reduces token usage without exposing one account's business data to another.

create table if not exists public.ai_generation_cache (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  plan jsonb not null check (jsonb_typeof(plan) = 'object'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  constraint ai_generation_cache_owner_request_unique unique (owner_id, request_hash),
  constraint ai_generation_cache_future_expiry check (expires_at > created_at)
);

create index if not exists ai_generation_cache_owner_expiry_idx
  on public.ai_generation_cache (owner_id, expires_at desc);

alter table public.ai_generation_cache enable row level security;

drop policy if exists ai_generation_cache_owner_all on public.ai_generation_cache;
create policy ai_generation_cache_owner_all on public.ai_generation_cache
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create or replace function public.clear_nexa_account()
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  delete from public.ai_generation_cache where owner_id = auth.uid();
  delete from public.clients where owner_id = auth.uid();
  delete from public.media where owner_id = auth.uid();
  delete from public.platform_settings where owner_id = auth.uid();
end;
$$;

revoke all on function public.clear_nexa_account() from public;
grant execute on function public.clear_nexa_account() to authenticated;
