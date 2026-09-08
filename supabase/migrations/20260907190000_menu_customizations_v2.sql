-- Personalizações são recalculadas pelo servidor a partir do catálogo publicado.
create or replace function public.nexa_calcular_opcoes_produto(produto jsonb, escolhas jsonb)
returns jsonb language plpgsql immutable set search_path=pg_catalog,public as $$
declare
  grupos jsonb := coalesce(produto->'personalizacoes','[]'::jsonb);
  grupo jsonb; opcao jsonb; escolha jsonb; quantidade integer; adicional numeric;
  preco numeric := round(coalesce(nullif((produto->>'precoPromocional')::numeric,0),(produto->>'preco')::numeric,0),2);
  rotulos text[] := array[]::text[];
begin
  if jsonb_typeof(escolhas) is distinct from 'array' or jsonb_array_length(escolhas)>100 then raise exception 'invalid_options'; end if;
  if jsonb_array_length(grupos)=0 and jsonb_array_length(coalesce(produto->'variacoes','[]'::jsonb))>0 then
    grupos := jsonb_build_array(jsonb_build_object('id','variacao','nome','Variação','minimo',0,'maximo',1,'opcoes',
      (select jsonb_agg(jsonb_build_object('id',(n-1)::text,'nome',v,'acrescimo',0)) from jsonb_array_elements_text(produto->'variacoes') with ordinality as t(v,n))));
  end if;
  if exists (select 1 from jsonb_array_elements(escolhas) e group by e->>'grupoId',e->>'opcaoId' having count(*)>1) then raise exception 'invalid_options'; end if;
  for escolha in select value from jsonb_array_elements(escolhas) loop
    select value into grupo from jsonb_array_elements(grupos) where value->>'id'=escolha->>'grupoId' limit 1;
    if grupo is null then raise exception 'invalid_options'; end if;
    select value into opcao from jsonb_array_elements(grupo->'opcoes') where value->>'id'=escolha->>'opcaoId' limit 1;
    if opcao is null then raise exception 'invalid_options'; end if;
    adicional := (opcao->>'acrescimo')::numeric;
    if adicional is null or adicional<0 or adicional>100000 then raise exception 'invalid_options'; end if;
    preco := preco+round(adicional,2);
    rotulos := array_append(rotulos, concat(grupo->>'nome',': ',opcao->>'nome'));
  end loop;
  for grupo in select value from jsonb_array_elements(grupos) loop
    select count(*) into quantidade from jsonb_array_elements(escolhas) e where e->>'grupoId'=grupo->>'id';
    if quantidade<coalesce((grupo->>'minimo')::integer,0) or quantidade>coalesce((grupo->>'maximo')::integer,1) then raise exception 'invalid_options'; end if;
  end loop;
  return jsonb_build_object('preco',preco,'rotulos',array_to_string(rotulos,' · '));
end $$;
revoke all on function public.nexa_calcular_opcoes_produto(jsonb,jsonb) from public;
-- O cliente pode ocultar modalidades e pagamentos no editor; esta regra garante
-- que uma requisição manipulada também não consiga usá-los no banco.
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
begin
  select m.id, m.published_content into v_site
  from public.minisites m
  where m.slug=lower(trim(requested_slug)) and m.status='publicado' and m.published_content is not null
    and (m.expires_at is null or m.expires_at > now())
    and public.nexa_plan_allows_public_site(m.owner_id);
  if not found then raise exception 'minisite_not_found'; end if;

  if requested_modalidade not in ('entrega','retirada','mesa') then raise exception 'invalid_modality'; end if;
  v_modalidades := v_site.published_content->'comercio'->'modalidadesPedido';
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
      and not exists (select 1 from jsonb_array_elements(coalesce(v_site.published_content->'comercio'->'taxasPorBairro','[]'::jsonb)) b where lower(trim(b->>'bairro'))=lower(v_bairro)) then raise exception 'delivery_fee_pending'; end if;
    v_taxa := coalesce((select (value->>'taxa')::numeric from jsonb_array_elements(coalesce(v_site.published_content->'comercio'->'taxasPorBairro','[]'::jsonb)) where lower(trim(value->>'bairro'))=lower(v_bairro) limit 1), v_taxa);
  end if;
  if requested_modalidade='mesa' then
    select id into v_mesa from public.mesas_cardapio where minisite_id=v_site.id and ativa and numero=nullif(requested_dados->>'mesa','')::integer;
    if v_mesa is null then raise exception 'invalid_table'; end if;
  end if;
  v_total:=v_subtotal+v_taxa;
  insert into public.pedidos_cardapio(minisite_id,mesa_id,modalidade,itens,subtotal,taxa_entrega,total,nome,telefone,endereco,bairro,complemento,referencia,observacao,horario_preferido,pessoas,pagamento,troco,chave_idempotencia)
  values(v_site.id,v_mesa,requested_modalidade,v_itens,v_subtotal,v_taxa,v_total,v_nome,v_telefone,left(coalesce(requested_dados->>'endereco',''),240),v_bairro,left(coalesce(requested_dados->>'complemento',''),160),left(coalesce(requested_dados->>'referencia',''),160),left(coalesce(requested_dados->>'observacao',''),1000),left(coalesce(requested_dados->>'horarioPreferido',''),80),nullif(requested_dados->>'pessoas','')::integer,v_pagamento,left(coalesce(requested_dados->>'troco',''),80),requested_chave) returning * into v_pedido;
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
