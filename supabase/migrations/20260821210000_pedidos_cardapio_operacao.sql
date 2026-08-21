-- Pedidos reais do Cardápio Digital. O visitante só pode criar pedidos pela
-- RPC abaixo: os preços, disponibilidade e taxa são sempre recalculados no banco.
create table if not exists public.mesas_cardapio (
  id uuid primary key default gen_random_uuid(),
  minisite_id uuid not null references public.minisites(id) on delete cascade,
  numero integer not null check (numero between 1 and 200),
  nome text,
  estado text not null default 'livre' check (estado in ('livre','ocupada','aguardando','atendimento')),
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (minisite_id, numero)
);

create table if not exists public.pedidos_cardapio (
  id uuid primary key default gen_random_uuid(),
  codigo bigint generated always as identity unique,
  minisite_id uuid not null references public.minisites(id) on delete cascade,
  mesa_id uuid references public.mesas_cardapio(id) on delete set null,
  modalidade text not null check (modalidade in ('entrega','retirada','mesa')),
  status text not null default 'novo' check (status in ('novo','aceito','preparo','pronto','em_rota','concluido','cancelado')),
  itens jsonb not null check (jsonb_typeof(itens) = 'array' and jsonb_array_length(itens) between 1 and 40),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  taxa_entrega numeric(12,2) not null default 0 check (taxa_entrega >= 0),
  total numeric(12,2) not null check (total >= 0),
  nome text not null check (char_length(nome) between 2 and 120),
  telefone text not null check (char_length(telefone) between 8 and 32),
  endereco text, bairro text, complemento text, referencia text, observacao text,
  horario_preferido text, pessoas integer check (pessoas between 1 and 100),
  pagamento text check (pagamento in ('pix','cartao','dinheiro')),
  troco text,
  chave_idempotencia uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (minisite_id, chave_idempotencia)
);

create index if not exists pedidos_cardapio_minisite_created_idx on public.pedidos_cardapio (minisite_id, created_at desc);
create index if not exists pedidos_cardapio_status_idx on public.pedidos_cardapio (minisite_id, status, created_at desc);

alter table public.mesas_cardapio enable row level security;
alter table public.pedidos_cardapio enable row level security;

create policy "owners manage their menu tables" on public.mesas_cardapio for all to authenticated
  using (exists (select 1 from public.minisites m where m.id = minisite_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from public.minisites m where m.id = minisite_id and m.owner_id = auth.uid()));
create policy "admins read menu tables" on public.mesas_cardapio for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "owners read menu orders" on public.pedidos_cardapio for select to authenticated
  using (exists (select 1 from public.minisites m where m.id = minisite_id and m.owner_id = auth.uid()) or public.has_role(auth.uid(), 'admin'));

create or replace function public.nexa_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end $$;
create trigger mesas_cardapio_touch before update on public.mesas_cardapio for each row execute function public.nexa_touch_updated_at();
create trigger pedidos_cardapio_touch before update on public.pedidos_cardapio for each row execute function public.nexa_touch_updated_at();

create or replace function public.nexa_criar_pedido_cardapio(
  requested_slug text,
  requested_items jsonb,
  requested_modalidade text,
  requested_dados jsonb default '{}'::jsonb,
  requested_chave uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_site record; v_item jsonb; v_prod jsonb; v_itens jsonb := '[]'::jsonb;
  v_subtotal numeric := 0; v_taxa numeric := 0; v_total numeric := 0;
  v_nome text := left(trim(coalesce(requested_dados->>'nome','')),120);
  v_telefone text := left(trim(coalesce(requested_dados->>'whatsapp','')),32);
  v_bairro text := left(trim(coalesce(requested_dados->>'bairro','')),120);
  v_pedido public.pedidos_cardapio%rowtype; v_mesa uuid;
begin
  select id, published_content into v_site from public.minisites
  where slug = lower(trim(requested_slug)) and status = 'published' and published_content is not null;
  if not found then raise exception 'minisite_not_found'; end if;
  if requested_modalidade not in ('entrega','retirada','mesa') then raise exception 'invalid_modality'; end if;
  if jsonb_typeof(requested_items) <> 'array' or jsonb_array_length(requested_items) not between 1 and 40 then raise exception 'invalid_items'; end if;
  if char_length(v_nome) < 2 or char_length(v_telefone) < 8 then raise exception 'invalid_contact'; end if;
  if requested_modalidade = 'entrega' and char_length(trim(coalesce(requested_dados->>'endereco',''))) < 5 then raise exception 'invalid_address'; end if;
  if requested_chave is not null then
    select * into v_pedido from public.pedidos_cardapio where minisite_id = v_site.id and chave_idempotencia = requested_chave;
    if found then return jsonb_build_object('id',v_pedido.id,'codigo',v_pedido.codigo,'total',v_pedido.total,'status',v_pedido.status,'repetido',true); end if;
  end if;
  if (select count(*) from public.pedidos_cardapio where minisite_id=v_site.id and telefone=v_telefone and created_at > now()-interval '10 minutes') >= 4 then raise exception 'rate_limit_exceeded'; end if;
  for v_item in select value from jsonb_array_elements(requested_items) loop
    select value into v_prod from jsonb_array_elements(coalesce(v_site.published_content->'produtos','[]'::jsonb))
    where value->>'id' = v_item->>'produtoId' and coalesce((value->>'disponivel')::boolean,true) = true limit 1;
    if v_prod is null then raise exception 'invalid_product'; end if;
    if coalesce((v_item->>'quantidade')::integer,0) not between 1 and 30 then raise exception 'invalid_quantity'; end if;
    v_subtotal := v_subtotal + coalesce(nullif((v_prod->>'precoPromocional')::numeric,0),(v_prod->>'preco')::numeric,0) * (v_item->>'quantidade')::integer;
    v_itens := v_itens || jsonb_build_array(jsonb_build_object('produtoId',v_prod->>'id','nome',v_prod->>'nome','preco',coalesce(nullif((v_prod->>'precoPromocional')::numeric,0),(v_prod->>'preco')::numeric,0),'quantidade',(v_item->>'quantidade')::integer,'observacao',left(coalesce(v_item->>'observacao',''),500)));
  end loop;
  if v_subtotal < coalesce((v_site.published_content->'comercio'->>'pedidoMinimo')::numeric,0) then raise exception 'minimum_not_reached'; end if;
  if requested_modalidade = 'entrega' then
    v_taxa := coalesce((v_site.published_content->'comercio'->>'taxaEntrega')::numeric,0);
    -- Taxa por bairro: [{"bairro":"Centro","taxa":8}] tem prioridade sobre a taxa padrão.
    select coalesce((value->>'taxa')::numeric,v_taxa) into v_taxa from jsonb_array_elements(coalesce(v_site.published_content->'comercio'->'taxasPorBairro','[]'::jsonb))
      where lower(trim(value->>'bairro')) = lower(v_bairro) limit 1;
  end if;
  if requested_modalidade = 'mesa' then
    select id into v_mesa from public.mesas_cardapio where minisite_id=v_site.id and ativa and numero = nullif(requested_dados->>'mesa','')::integer;
    if v_mesa is null then raise exception 'invalid_table'; end if;
  end if;
  v_total := v_subtotal + v_taxa;
  insert into public.pedidos_cardapio (minisite_id,mesa_id,modalidade,itens,subtotal,taxa_entrega,total,nome,telefone,endereco,bairro,complemento,referencia,observacao,horario_preferido,pessoas,pagamento,troco,chave_idempotencia)
  values (v_site.id,v_mesa,requested_modalidade,v_itens,v_subtotal,v_taxa,v_total,v_nome,v_telefone,left(coalesce(requested_dados->>'endereco',''),240),v_bairro,left(coalesce(requested_dados->>'complemento',''),160),left(coalesce(requested_dados->>'referencia',''),160),left(coalesce(requested_dados->>'observacao',''),1000),left(coalesce(requested_dados->>'horarioPreferido',''),80),nullif(requested_dados->>'pessoas','')::integer,requested_dados->>'pagamento',left(coalesce(requested_dados->>'troco',''),80),requested_chave) returning * into v_pedido;
  return jsonb_build_object('id',v_pedido.id,'codigo',v_pedido.codigo,'total',v_pedido.total,'status',v_pedido.status,'repetido',false);
end $$;
grant execute on function public.nexa_criar_pedido_cardapio(text,jsonb,text,jsonb,uuid) to anon, authenticated;

create or replace function public.nexa_atualizar_status_pedido(requested_id uuid, requested_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.pedidos_cardapio%rowtype;
begin
 if requested_status not in ('novo','aceito','preparo','pronto','em_rota','concluido','cancelado') then raise exception 'invalid_status'; end if;
 update public.pedidos_cardapio p set status=requested_status where p.id=requested_id and (exists(select 1 from public.minisites m where m.id=p.minisite_id and m.owner_id=auth.uid()) or public.has_role(auth.uid(),'admin')) returning * into v;
 if not found then raise exception 'not_allowed'; end if;
 return jsonb_build_object('id',v.id,'status',v.status,'updatedAt',v.updated_at);
end $$;
grant execute on function public.nexa_atualizar_status_pedido(uuid,text) to authenticated;

do $$ begin
  alter table public.notification_deliveries drop constraint if exists notification_deliveries_source_type_check;
  alter table public.notification_deliveries add constraint notification_deliveries_source_type_check check (source_type in ('formulario','agendamento','reserva','pedido'));
exception when undefined_table then null; end $$;
