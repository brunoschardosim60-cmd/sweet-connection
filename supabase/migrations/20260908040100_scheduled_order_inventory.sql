create or replace function public.nexa_validar_itens_disponiveis_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_conteudo jsonb; v_item jsonb; v_produto jsonb;
  v_inicio time; v_fim time; v_hora time; v_fuso text; v_estoque integer; v_quantidade integer;
begin
  select published_content into v_conteudo from public.minisites where id = new.minisite_id;
  v_fuso:=coalesce(v_conteudo->'comercio'->>'fusoHorario','America/Sao_Paulo');
  if v_fuso not in ('America/Sao_Paulo','America/Manaus','America/Rio_Branco','America/Noronha') then v_fuso:='America/Sao_Paulo'; end if;
  v_hora:=(coalesce(new.agendado_para,now()) at time zone v_fuso)::time;
  for v_item in select value from jsonb_array_elements(new.itens) loop
    select value into v_produto from jsonb_array_elements(coalesce(v_conteudo->'produtos', '[]'::jsonb)) where value->>'id'=v_item->>'produtoId' limit 1;
    if v_produto is null or coalesce((v_produto->>'disponivel')::boolean,true)=false then raise exception 'invalid_product'; end if;
    if coalesce(v_produto->>'disponivelInicio','') ~ '^\d{2}:\d{2}$' and coalesce(v_produto->>'disponivelFim','') ~ '^\d{2}:\d{2}$' then
      v_inicio := (v_produto->>'disponivelInicio')::time; v_fim := (v_produto->>'disponivelFim')::time;
      if not ((v_inicio<=v_fim and v_hora between v_inicio and v_fim) or (v_inicio>v_fim and (v_hora>=v_inicio or v_hora<=v_fim))) then raise exception 'invalid_product'; end if;
    end if;
    if coalesce(v_produto->>'estoque','') ~ '^\d+$' then
      v_estoque := (v_produto->>'estoque')::integer;
      v_quantidade := coalesce((v_item->>'quantidade')::integer, 0);
      insert into public.estoque_cardapio(minisite_id,produto_id,quantidade) values(new.minisite_id,v_produto->>'id',v_estoque) on conflict do nothing;
      update public.estoque_cardapio set quantidade=quantidade-v_quantidade, updated_at=now()
      where minisite_id=new.minisite_id and produto_id=v_produto->>'id' and quantidade>=v_quantidade;
      if not found then raise exception 'invalid_product'; end if;
    end if;
  end loop;
  return new;
end $$;


revoke all on function public.nexa_validar_itens_disponiveis_pedido() from public,anon,authenticated;
