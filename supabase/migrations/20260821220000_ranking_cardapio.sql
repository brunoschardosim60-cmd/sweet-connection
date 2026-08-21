-- Exposição pública mínima: somente total agregado por produto, sem dados de cliente.
create or replace function public.nexa_ranking_produtos_cardapio(requested_slug text)
returns table(produto_id text, pedidos bigint)
language sql security definer set search_path = public as $$
  select item->>'produtoId' as produto_id, sum(coalesce((item->>'quantidade')::integer, 0))::bigint as pedidos
  from public.pedidos_cardapio p
  cross join lateral jsonb_array_elements(p.itens) item
  join public.minisites m on m.id = p.minisite_id
  where m.slug = lower(trim(requested_slug))
    and m.status = 'publicado'
    and p.status <> 'cancelado'
  group by item->>'produtoId';
$$;
grant execute on function public.nexa_ranking_produtos_cardapio(text) to anon, authenticated;
