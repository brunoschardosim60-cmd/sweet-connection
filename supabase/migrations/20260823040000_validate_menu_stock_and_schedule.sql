-- A página pública esconde itens esgotados/fora do horário; este trigger repete
-- a regra no servidor para impedir que uma requisição manual crie o pedido mesmo assim.
create or replace function public.nexa_validar_itens_disponiveis_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_conteudo jsonb;
  v_item jsonb;
  v_produto jsonb;
  v_inicio time;
  v_fim time;
begin
  select published_content into v_conteudo
  from public.minisites
  where id = new.minisite_id;

  for v_item in select value from jsonb_array_elements(new.itens) loop
    select value into v_produto
    from jsonb_array_elements(coalesce(v_conteudo->'produtos', '[]'::jsonb))
    where value->>'id' = v_item->>'produtoId'
    limit 1;

    if v_produto is null
      or coalesce((v_produto->>'disponivel')::boolean, true) = false
      or (coalesce(v_produto->>'estoque', '') ~ '^\d+$' and (v_produto->>'estoque')::integer <= 0) then
      raise exception 'invalid_product';
    end if;

    if coalesce(v_produto->>'disponivelInicio', '') ~ '^\d{2}:\d{2}$'
      and coalesce(v_produto->>'disponivelFim', '') ~ '^\d{2}:\d{2}$' then
      v_inicio := (v_produto->>'disponivelInicio')::time;
      v_fim := (v_produto->>'disponivelFim')::time;
      if not (
        (v_inicio <= v_fim and localtime between v_inicio and v_fim)
        or (v_inicio > v_fim and (localtime >= v_inicio or localtime <= v_fim))
      ) then
        raise exception 'invalid_product';
      end if;
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists nexa_validar_itens_disponiveis_pedido on public.pedidos_cardapio;
create trigger nexa_validar_itens_disponiveis_pedido
  before insert on public.pedidos_cardapio
  for each row execute function public.nexa_validar_itens_disponiveis_pedido();
