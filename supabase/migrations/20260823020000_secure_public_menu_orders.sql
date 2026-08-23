-- Pedidos só podem ser criados para um cardápio que continua publicamente ativo.
-- Isto acompanha a mesma regra usada pela rota pública /site/:slug.
create or replace function public.nexa_criar_pedido_cardapio(
  requested_slug text, requested_items jsonb, requested_modalidade text,
  requested_dados jsonb default '{}'::jsonb, requested_chave uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_site record; v_item jsonb; v_prod jsonb; v_itens jsonb := '[]'::jsonb;
  v_subtotal numeric := 0; v_taxa numeric := 0; v_total numeric := 0;
  v_nome text := left(trim(coalesce(requested_dados->>'nome','')),120);
  v_telefone text := left(trim(coalesce(requested_dados->>'whatsapp','')),32);
  v_bairro text := left(trim(coalesce(requested_dados->>'bairro','')),120);
  v_pedido public.pedidos_cardapio%rowtype; v_mesa uuid;
begin
  select m.id, m.published_content into v_site
  from public.minisites m
  where m.slug=lower(trim(requested_slug)) and m.status='publicado' and m.published_content is not null
    and (m.expires_at is null or m.expires_at > now())
    and public.nexa_plan_allows_public_site(m.owner_id);
  if not found then raise exception 'minisite_not_found'; end if;
  if requested_modalidade not in ('entrega','retirada','mesa') then raise exception 'invalid_modality'; end if;
  if jsonb_typeof(requested_items) <> 'array' or jsonb_array_length(requested_items) not between 1 and 40 then raise exception 'invalid_items'; end if;
  if char_length(v_nome) < 2 or char_length(v_telefone) < 8 then raise exception 'invalid_contact'; end if;
  if requested_modalidade='entrega' and char_length(trim(coalesce(requested_dados->>'endereco',''))) < 5 then raise exception 'invalid_address'; end if;
  if requested_chave is not null then select * into v_pedido from public.pedidos_cardapio where minisite_id=v_site.id and chave_idempotencia=requested_chave; if found then return jsonb_build_object('id',v_pedido.id,'codigo',v_pedido.codigo,'total',v_pedido.total,'status',v_pedido.status,'repetido',true); end if; end if;
  if (select count(*) from public.pedidos_cardapio where minisite_id=v_site.id and telefone=v_telefone and created_at>now()-interval '10 minutes') >= 4 then raise exception 'rate_limit_exceeded'; end if;
  for v_item in select value from jsonb_array_elements(requested_items) loop
    select value into v_prod from jsonb_array_elements(coalesce(v_site.published_content->'produtos','[]'::jsonb)) where value->>'id'=v_item->>'produtoId' and coalesce((value->>'disponivel')::boolean,true)=true limit 1;
    if v_prod is null or coalesce((v_item->>'quantidade')::integer,0) not between 1 and 30 then raise exception 'invalid_product'; end if;
    v_subtotal:=v_subtotal+coalesce(nullif((v_prod->>'precoPromocional')::numeric,0),(v_prod->>'preco')::numeric,0)*(v_item->>'quantidade')::integer;
    v_itens:=v_itens||jsonb_build_array(jsonb_build_object('produtoId',v_prod->>'id','nome',v_prod->>'nome','preco',coalesce(nullif((v_prod->>'precoPromocional')::numeric,0),(v_prod->>'preco')::numeric,0),'quantidade',(v_item->>'quantidade')::integer,'observacao',left(coalesce(v_item->>'observacao',''),500)));
  end loop;
  if v_subtotal<coalesce((v_site.published_content->'comercio'->>'pedidoMinimo')::numeric,0) then raise exception 'minimum_not_reached'; end if;
  if requested_modalidade='entrega' then v_taxa:=coalesce((v_site.published_content->'comercio'->>'taxaEntrega')::numeric,0); select coalesce((value->>'taxa')::numeric,v_taxa) into v_taxa from jsonb_array_elements(coalesce(v_site.published_content->'comercio'->'taxasPorBairro','[]'::jsonb)) where lower(trim(value->>'bairro'))=lower(v_bairro) limit 1; end if;
  if requested_modalidade='mesa' then select id into v_mesa from public.mesas_cardapio where minisite_id=v_site.id and ativa and numero=nullif(requested_dados->>'mesa','')::integer; if v_mesa is null then raise exception 'invalid_table'; end if; end if;
  v_total:=v_subtotal+v_taxa;
  insert into public.pedidos_cardapio(minisite_id,mesa_id,modalidade,itens,subtotal,taxa_entrega,total,nome,telefone,endereco,bairro,complemento,referencia,observacao,horario_preferido,pessoas,pagamento,troco,chave_idempotencia) values(v_site.id,v_mesa,requested_modalidade,v_itens,v_subtotal,v_taxa,v_total,v_nome,v_telefone,left(coalesce(requested_dados->>'endereco',''),240),v_bairro,left(coalesce(requested_dados->>'complemento',''),160),left(coalesce(requested_dados->>'referencia',''),160),left(coalesce(requested_dados->>'observacao',''),1000),left(coalesce(requested_dados->>'horarioPreferido',''),80),nullif(requested_dados->>'pessoas','')::integer,requested_dados->>'pagamento',left(coalesce(requested_dados->>'troco',''),80),requested_chave) returning * into v_pedido;
  return jsonb_build_object('id',v_pedido.id,'codigo',v_pedido.codigo,'total',v_pedido.total,'status',v_pedido.status,'repetido',false);
end $$;

grant execute on function public.nexa_criar_pedido_cardapio(text,jsonb,text,jsonb,uuid) to anon, authenticated;
