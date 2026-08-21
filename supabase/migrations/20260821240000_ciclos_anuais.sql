alter table public.billing_checkout_sessions
  add column if not exists billing_cycle text not null default 'monthly'
  check (billing_cycle in ('monthly','annual'));
