-- Registra sessões de checkout no servidor. A referência enviada ao Asaas nunca
-- carrega o plano ou o id do usuário diretamente, evitando ativação forjada.
create table if not exists public.billing_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('asaas', 'stripe')),
  tier text not null check (tier in ('essential', 'professional', 'catalog')),
  status text not null default 'created' check (status in ('created', 'pending', 'paid', 'past_due', 'cancelled', 'failed')),
  provider_checkout_id text unique,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists billing_checkout_sessions_owner_created_idx
  on public.billing_checkout_sessions (owner_id, created_at desc);

alter table public.billing_checkout_sessions enable row level security;
-- Não há política para o navegador: a criação e o processamento são somente no servidor.

alter table public.profiles
  add column if not exists billing_provider text check (billing_provider in ('asaas', 'stripe', 'manual')),
  add column if not exists billing_customer_id text,
  add column if not exists billing_subscription_id text,
  add column if not exists billing_updated_at timestamptz;

create unique index if not exists profiles_billing_subscription_id_unique
  on public.profiles (billing_subscription_id)
  where billing_subscription_id is not null;

create or replace function public.touch_billing_checkout_session()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists billing_checkout_sessions_touch_updated_at on public.billing_checkout_sessions;
create trigger billing_checkout_sessions_touch_updated_at
before update on public.billing_checkout_sessions
for each row execute function public.touch_billing_checkout_session();
