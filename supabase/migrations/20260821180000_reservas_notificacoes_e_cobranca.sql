-- Reservas de hospedagem, entregas de notificações e ciclo comercial.
create extension if not exists btree_gist;

create table public.reservas_hospedagem (
  id uuid primary key default gen_random_uuid(),
  minisite_id uuid not null references public.minisites(id) on delete cascade,
  acomodacao text not null default 'principal' check (char_length(acomodacao) between 1 and 120),
  check_in date not null,
  check_out date not null,
  hospedes integer not null check (hospedes between 1 and 30),
  nome text not null check (char_length(nome) between 2 and 120),
  telefone text not null default '' check (char_length(telefone) <= 40),
  email text not null default '' check (char_length(email) <= 254),
  observacao text not null default '' check (char_length(observacao) <= 1000),
  status text not null default 'confirmada' check (status in ('confirmada', 'cancelada')),
  token uuid not null default gen_random_uuid() unique,
  chave_idempotencia text,
  notification_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in)
);

create unique index reservas_hospedagem_chave_unica
  on public.reservas_hospedagem(minisite_id, chave_idempotencia)
  where chave_idempotencia is not null;
create index reservas_hospedagem_minisite_periodo_idx
  on public.reservas_hospedagem(minisite_id, check_in, check_out);
alter table public.reservas_hospedagem add constraint reservas_hospedagem_sem_sobreposicao
  exclude using gist (
    minisite_id with =,
    acomodacao with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status = 'confirmada');

alter table public.reservas_hospedagem enable row level security;
create policy reservas_hospedagem_owner_all on public.reservas_hospedagem
  for all to authenticated
  using (exists(select 1 from public.minisites m where m.id = minisite_id and m.owner_id = auth.uid()))
  with check (exists(select 1 from public.minisites m where m.id = minisite_id and m.owner_id = auth.uid()));
create policy reservas_hospedagem_admin_read on public.reservas_hospedagem
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
grant all on public.reservas_hospedagem to service_role;

create trigger reservas_hospedagem_updated_at before update on public.reservas_hospedagem
for each row execute function public.set_updated_at();

create or replace function public.nexa_reservar_hospedagem(
  requested_slug text, requested_check_in date, requested_check_out date,
  requested_acomodacao text, requested_hospedes integer, requested_nome text,
  requested_telefone text default '', requested_email text default '',
  requested_observacao text default '', requested_chave text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare site_id uuid; nova public.reservas_hospedagem; chave text := nullif(left(coalesce(requested_chave,''),80),'');
begin
  select id into site_id from public.minisites
  where slug=lower(trim(requested_slug)) and status='publicado' and published_content is not null;
  if site_id is null then raise exception 'minisite_indisponivel'; end if;
  if requested_check_in < (now() at time zone 'America/Sao_Paulo')::date then raise exception 'checkin_invalido'; end if;
  if requested_check_out <= requested_check_in then raise exception 'periodo_invalido'; end if;
  if requested_hospedes not between 1 and 30 then raise exception 'hospedes_invalidos'; end if;
  if char_length(trim(coalesce(requested_nome,''))) < 2 then raise exception 'nome_invalido'; end if;
  if chave is not null then
    select * into nova from public.reservas_hospedagem where minisite_id=site_id and chave_idempotencia=chave;
    if found then return jsonb_build_object('id',nova.id,'token',nova.token,'check_in',nova.check_in,'check_out',nova.check_out,'repetido',true); end if;
  end if;
  if (select count(*) from public.reservas_hospedagem r where r.minisite_id=site_id and r.created_at>now()-interval '1 hour' and r.telefone=left(coalesce(requested_telefone,''),40)) >= 5 then
    raise exception 'rate_limit_exceeded';
  end if;
  begin
    insert into public.reservas_hospedagem(minisite_id,acomodacao,check_in,check_out,hospedes,nome,telefone,email,observacao,chave_idempotencia)
    values(site_id,left(coalesce(nullif(trim(requested_acomodacao),''),'principal'),120),requested_check_in,requested_check_out,requested_hospedes,left(trim(requested_nome),120),left(coalesce(requested_telefone,''),40),left(lower(trim(coalesce(requested_email,''))),254),left(coalesce(requested_observacao,''),1000),chave)
    returning * into nova;
  exception when exclusion_violation then raise exception 'periodo_indisponivel'; end;
  return jsonb_build_object('id',nova.id,'token',nova.token,'check_in',nova.check_in,'check_out',nova.check_out,'repetido',false);
end; $$;
grant execute on function public.nexa_reservar_hospedagem(text,date,date,text,integer,text,text,text,text,text) to anon, authenticated;

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('formulario','agendamento','reserva')),
  source_id uuid not null,
  channel text not null check (channel in ('email','whatsapp')),
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_type, source_id, channel)
);
alter table public.notification_deliveries enable row level security;
grant all on public.notification_deliveries to service_role;
create trigger notification_deliveries_updated_at before update on public.notification_deliveries
for each row execute function public.set_updated_at();

alter table public.profiles
  add column if not exists billing_cancel_at_period_end boolean not null default false,
  add column if not exists billing_current_period_end timestamptz;

create table public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check(provider in ('asaas','stripe')),
  provider_payment_id text not null unique,
  provider_subscription_id text,
  tier text check(tier in ('essential','professional','catalog')),
  status text not null,
  amount numeric(12,2),
  due_date date,
  paid_at timestamptz,
  invoice_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.billing_invoices enable row level security;
create policy billing_invoices_owner_read on public.billing_invoices for select to authenticated using(owner_id=auth.uid());
create policy billing_invoices_admin_read on public.billing_invoices for select to authenticated using(public.has_role(auth.uid(),'admin'));
grant all on public.billing_invoices to service_role;
create trigger billing_invoices_updated_at before update on public.billing_invoices
for each row execute function public.set_updated_at();

create or replace function public.nexa_plan_allows_publish(requested_user_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select public.has_role(requested_user_id, 'admin') or exists (
    select 1 from public.profiles p where p.id=requested_user_id
      and p.subscription_status='active' and p.subscription_tier<>'none'
      and (not p.billing_cancel_at_period_end or p.billing_current_period_end is null or p.billing_current_period_end > now())
  );
$$;
revoke all on function public.nexa_plan_allows_publish(uuid) from public;
grant execute on function public.nexa_plan_allows_publish(uuid) to authenticated, service_role;
