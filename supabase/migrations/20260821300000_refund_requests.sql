-- Refunds are intentionally requested by the account owner and reviewed before
-- any financial action is sent to the payment provider.
create table if not exists public.billing_refund_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('asaas', 'stripe')),
  provider_payment_id text not null,
  amount numeric(12,2) not null check (amount > 0),
  reason text not null check (char_length(reason) between 10 and 500),
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'refunded')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  resolution_note text,
  provider_refund_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

alter table public.billing_refund_requests enable row level security;

create policy billing_refund_requests_owner_read on public.billing_refund_requests
  for select to authenticated using (owner_id = auth.uid());

create policy billing_refund_requests_admin_read on public.billing_refund_requests
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

grant all on public.billing_refund_requests to service_role;

drop trigger if exists billing_refund_requests_updated_at on public.billing_refund_requests;
create trigger billing_refund_requests_updated_at
  before update on public.billing_refund_requests
  for each row execute function public.set_updated_at();
