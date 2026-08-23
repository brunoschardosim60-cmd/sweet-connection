create table if not exists public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  reference_month date not null,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default now(),
  unique (owner_id, reference_month)
);

alter table public.monthly_reports enable row level security;

drop policy if exists "owner lê relatórios mensais" on public.monthly_reports;
create policy "owner lê relatórios mensais" on public.monthly_reports for select to authenticated
using (owner_id = auth.uid());

-- Somente o serviço de backend usa a service role para criar o envio.
