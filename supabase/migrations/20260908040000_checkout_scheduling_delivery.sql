-- Cotações privadas: só o servidor calcula e grava o frete.
create table public.cotacoes_entrega (
 id uuid primary key default gen_random_uuid(),
 minisite_id uuid not null references public.minisites(id) on delete cascade,
 endereco text not null, bairro text not null, configuracao jsonb not null,
 taxa numeric(12,2) not null check(taxa>=0),
 expires_at timestamptz not null default now()+interval '15 minutes', used_at timestamptz
);
alter table public.cotacoes_entrega enable row level security;
revoke all on public.cotacoes_entrega from public,anon,authenticated;
grant all on public.cotacoes_entrega to service_role;
create index cotacoes_entrega_expiry on public.cotacoes_entrega(expires_at);

-- Limite persistente impede que múltiplas instâncias contornem a proteção de custo.
create table public.cotacoes_limites (
 chave text primary key, janela timestamptz not null, quantidade integer not null
);
alter table public.cotacoes_limites enable row level security;
revoke all on public.cotacoes_limites from public,anon,authenticated;
grant all on public.cotacoes_limites to service_role;
create or replace function public.nexa_limite_cotacao(chave text, limite integer, segundos integer)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare v integer; j timestamptz:=to_timestamp(floor(extract(epoch from now())/segundos)*segundos);
begin
 insert into public.cotacoes_limites as c values(chave,j,1)
 on conflict on constraint cotacoes_limites_pkey do update set janela=j,quantidade=case when c.janela=j then c.quantidade+1 else 1 end
 returning quantidade into v;
 delete from public.cotacoes_limites where janela<now()-interval '2 days';
 delete from public.cotacoes_entrega where expires_at<now();
 return v<=limite;
end $$;
revoke all on function public.nexa_limite_cotacao(text,integer,integer) from public,anon,authenticated;
grant execute on function public.nexa_limite_cotacao(text,integer,integer) to service_role;

alter table public.pedidos_cardapio add column agendado_para timestamptz;

create or replace function public.nexa_loja_aberta(conteudo jsonb, instante timestamptz)
returns boolean language plpgsql stable set search_path=pg_catalog,public as $$
declare h jsonb:=coalesce(conteudo->'conteudo'->'horarios','[]'::jsonb); d jsonb; z text;
 local timestamp; indice integer; inicio time; fim time; anterior boolean;
begin
 if jsonb_array_length(h)=0 then return true; end if;
 z:=coalesce(conteudo->'comercio'->>'fusoHorario','America/Sao_Paulo');
 if z not in ('America/Sao_Paulo','America/Manaus','America/Rio_Branco','America/Noronha') then z:='America/Sao_Paulo'; end if;
 local:=instante at time zone z; indice:=extract(isodow from local)::integer-1;
 foreach anterior in array array[false,true] loop
   d:=h->(case when anterior then (indice+6)%7 else indice end);
   if d is null or coalesce((d->>'fechado')::boolean,true) then continue; end if;
   if coalesce(d->>'abre','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(d->>'fecha','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' then continue; end if;
   inicio:=(d->>'abre')::time; fim:=(d->>'fecha')::time;
   if (anterior and inicio>fim and local::time<fim)
      or (not anterior and ((inicio<fim and local::time>=inicio and local::time<fim) or (inicio>fim and local::time>=inicio))) then return true; end if;
 end loop;
 return false;
end $$;
revoke all on function public.nexa_loja_aberta(jsonb,timestamptz) from public,anon,authenticated;

create or replace function public.nexa_criar_pedido_cardapio(
  requested_slug text, requested_items jsonb, requested_modalidade text,
  requested_dados jsonb default '{}'::jsonb, requested_chave uuid default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_site record; v_item jsonb; v_prod jsonb; v_itens jsonb := '[]'::jsonb;
  v_subtotal numeric := 0; v_taxa numeric := 0; v_total numeric := 0;
  v_nome text := left(trim(coalesce(requested_dados->>'nome','')),120);
  v_telefone text := left(trim(coalesce(requested_dados->>'whatsapp','')),32);
  v_bairro text := left(trim(coalesce(requested_dados->>'bairro','')),120);
  v_pagamento text := nullif(lower(trim(coalesce(requested_dados->>'pagamento',''))), '');
  v_modalidades jsonb; v_calculo jsonb; v_nota text;
  v_pagamentos jsonb;
  v_pedido public.pedidos_cardapio%rowtype; v_mesa uuid;
  v_agendado timestamptz; v_cotacao public.cotacoes_entrega%rowtype;
begin
  select m.id, m.published_content into v_site
  from public.minisites m
  where m.slug=lower(trim(requested_slug)) and m.status='publicado' and m.published_content is not null
    and (m.expires_at is null or m.expires_at > now())
    and public.nexa_plan_allows_public_site(m.owner_id);
  if not found then raise exception 'minisite_not_found'; end if;

  if requested_chave is not null then
    perform pg_advisory_xact_lock(hashtextextended(v_site.id::text || requested_chave::text, 0));
    select * into v_pedido from public.pedidos_cardapio where minisite_id=v_site.id and chave_idempotencia=requested_chave;
    if found then return jsonb_build_object('id',v_pedido.id,'codigo',v_pedido.codigo,'total',v_pedido.total,'status',v_pedido.status,'repetido',true,'trackingToken',v_pedido.tracking_token); end if;
  end if;
  v_agendado := nullif(requested_dados->>'agendadoPara','')::timestamptz;
  if v_agendado is not null then
    if coalesce((v_site.published_content->'comercio'->>'aceitarAgendamento')::boolean,true)=false
       or v_agendado < now()+interval '30 minutes' or v_agendado > now()+interval '7 days'
       or not public.nexa_loja_aberta(v_site.published_content,v_agendado) then raise exception 'invalid_schedule'; end if;
  elsif not public.nexa_loja_aberta(v_site.published_content,now()) then raise exception 'store_closed'; end if;

  if requested_modalidade not in ('entrega','retirada','mesa') then raise exception 'invalid_modality'; end if;
  v_modalidades := coalesce(v_site.published_content->'comercio'->'modalidadesPedido','["entrega","retirada"]'::jsonb);
  if jsonb_typeof(v_modalidades) = 'array' and jsonb_array_length(v_modalidades) > 0
    and not exists (
      select 1
      from jsonb_array_elements_text(v_modalidades) as item(value)
      where item.value = requested_modalidade
    ) then
    raise exception 'invalid_modality';
  end if;

  if v_pagamento is not null then
    if v_pagamento not in ('pix','cartao','dinheiro','balcao') then raise exception 'invalid_payment'; end if;
    v_pagamentos := v_site.published_content->'comercio'->'pagamentosAceitos';
    if jsonb_typeof(v_pagamentos) = 'array' and jsonb_array_length(v_pagamentos) > 0
      and not exists (
        select 1
        from jsonb_array_elements_text(v_pagamentos) as item(value)
        where item.value = v_pagamento
      ) then
      raise exception 'invalid_payment';
    end if;
  end if;

  if jsonb_typeof(requested_items) <> 'array' or jsonb_array_length(requested_items) not between 1 and 40 then raise exception 'invalid_items'; end if;
  if char_length(v_nome) < 2 or char_length(v_telefone) < 8 then raise exception 'invalid_contact'; end if;
  if requested_modalidade='entrega' and char_length(trim(coalesce(requested_dados->>'endereco',''))) < 5 then raise exception 'invalid_address'; end if;
  if requested_chave is not null then
    select * into v_pedido from public.pedidos_cardapio where minisite_id=v_site.id and chave_idempotencia=requested_chave;
    if found then return jsonb_build_object('id',v_pedido.id,'codigo',v_pedido.codigo,'total',v_pedido.total,'status',v_pedido.status,'repetido',true,'trackingToken',v_pedido.tracking_token); end if;
  end if;
  if (select count(*) from public.pedidos_cardapio where minisite_id=v_site.id and telefone=v_telefone and created_at>now()-interval '10 minutes') >= 4 then raise exception 'rate_limit_exceeded'; end if;
  for v_item in select value from jsonb_array_elements(requested_items) loop
    select value into v_prod from jsonb_array_elements(coalesce(v_site.published_content->'produtos','[]'::jsonb)) where value->>'id'=v_item->>'produtoId' and coalesce((value->>'disponivel')::boolean,true)=true limit 1;
    if v_prod is null or coalesce((v_item->>'quantidade')::integer,0) not between 1 and 30 then raise exception 'invalid_product'; end if;
    v_calculo := public.nexa_calcular_opcoes_produto(v_prod, coalesce(v_item->'escolhas','[]'::jsonb));
    v_subtotal := v_subtotal + (v_calculo->>'preco')::numeric * (v_item->>'quantidade')::integer;
    v_nota := left(coalesce(v_item->>'observacaoLivre',v_item->>'observacao',''),500);
    v_itens := v_itens || jsonb_build_array(jsonb_build_object(
      'produtoId',v_prod->>'id','nome',v_prod->>'nome','preco',(v_calculo->>'preco')::numeric,
      'quantidade',(v_item->>'quantidade')::integer,'escolhas',v_item->'escolhas',
      'observacao',concat_ws(' · ',nullif(v_calculo->>'rotulos',''),nullif(v_nota,''))));
  end loop;
  if exists (select 1 from jsonb_array_elements(v_itens) x group by x->>'produtoId' having sum((x->>'quantidade')::integer)>30) then raise exception 'invalid_quantity'; end if;
  if v_subtotal<coalesce((v_site.published_content->'comercio'->>'pedidoMinimo')::numeric,0) then raise exception 'minimum_not_reached'; end if;
  if requested_modalidade='entrega' then
    v_taxa:=coalesce((v_site.published_content->'comercio'->>'taxaEntrega')::numeric,0);
    if coalesce((v_site.published_content->'comercio'->>'taxaEntregaDefinida')::boolean,true)=false
      and coalesce(v_site.published_content->'comercio'->>'calculoEntrega','')<>'distancia'
      and not exists (select 1 from jsonb_array_elements(coalesce(v_site.published_content->'comercio'->'taxasPorBairro','[]'::jsonb)) b where lower(trim(b->>'bairro'))=lower(v_bairro)) then raise exception 'delivery_fee_pending'; end if;
    v_taxa := coalesce((select (value->>'taxa')::numeric from jsonb_array_elements(coalesce(v_site.published_content->'comercio'->'taxasPorBairro','[]'::jsonb)) where lower(trim(value->>'bairro'))=lower(v_bairro) limit 1), v_taxa);
  end if;
  if requested_modalidade='mesa' then
    select id into v_mesa from public.mesas_cardapio where minisite_id=v_site.id and ativa and numero=nullif(requested_dados->>'mesa','')::integer;
    if v_mesa is null then raise exception 'invalid_table'; end if;
  end if;
  if requested_modalidade='entrega' then
    if v_site.published_content->'comercio'->>'calculoEntrega'='bairro' and not exists (
      select 1 from jsonb_array_elements(coalesce(v_site.published_content->'comercio'->'taxasPorBairro','[]'::jsonb)) b
      where lower(trim(b->>'bairro'))=lower(v_bairro)
    ) then raise exception 'outside_delivery_area'; end if;
    if v_site.published_content->'comercio'->>'calculoEntrega'='distancia' then
      select * into v_cotacao from public.cotacoes_entrega
      where id=nullif(requested_dados->>'cotacaoId','')::uuid and minisite_id=v_site.id
        and expires_at>now() and used_at is null
        and endereco=trim(requested_dados->>'endereco') and bairro=v_bairro
        and configuracao=v_site.published_content->'comercio' for update;
      if not found then raise exception 'invalid_delivery_quote'; end if;
      v_taxa:=v_cotacao.taxa;
      update public.cotacoes_entrega set used_at=now() where id=v_cotacao.id;
    end if;
  end if;
  if v_taxa is null or v_taxa < 0 or v_taxa > 100000 then raise exception 'delivery_fee_pending'; end if;
  v_total:=v_subtotal+v_taxa;
  insert into public.pedidos_cardapio(minisite_id,mesa_id,modalidade,itens,subtotal,taxa_entrega,total,nome,telefone,endereco,bairro,complemento,referencia,observacao,horario_preferido,pessoas,pagamento,troco,chave_idempotencia,agendado_para)
  values(v_site.id,v_mesa,requested_modalidade,v_itens,v_subtotal,v_taxa,v_total,v_nome,v_telefone,left(coalesce(requested_dados->>'endereco',''),240),v_bairro,left(coalesce(requested_dados->>'complemento',''),160),left(coalesce(requested_dados->>'referencia',''),160),left(coalesce(requested_dados->>'observacao',''),1000),left(coalesce(requested_dados->>'horarioPreferido',''),80),nullif(requested_dados->>'pessoas','')::integer,v_pagamento,left(coalesce(requested_dados->>'troco',''),80),requested_chave,v_agendado) returning * into v_pedido;
  return jsonb_build_object('id',v_pedido.id,'codigo',v_pedido.codigo,'total',v_pedido.total,'status',v_pedido.status,'repetido',false,'trackingToken',v_pedido.tracking_token);
end $$;

revoke all on function public.nexa_criar_pedido_cardapio(text,jsonb,text,jsonb,uuid) from public;
grant execute on function public.nexa_criar_pedido_cardapio(text,jsonb,text,jsonb,uuid) to anon, authenticated;


-- Endpoint versionado: o cliente não envia personalizações para uma RPC antiga
-- que poderia ignorar os acréscimos. Instale esta migração antes do front-end.
create or replace function public.nexa_criar_pedido_cardapio_v2(
 requested_slug text, requested_items jsonb, requested_modalidade text,
 requested_dados jsonb default '{}'::jsonb, requested_chave uuid default null
) returns jsonb language sql security definer set search_path=pg_catalog,public as $$
 select public.nexa_criar_pedido_cardapio(requested_slug,requested_items,requested_modalidade,requested_dados,requested_chave)
$$;
revoke all on function public.nexa_criar_pedido_cardapio_v2(text,jsonb,text,jsonb,uuid) from public;
grant execute on function public.nexa_criar_pedido_cardapio_v2(text,jsonb,text,jsonb,uuid) to anon,authenticated;

