-- Estoque é separado do conteúdo publicado para não reduzir o rascunho do dono a cada pedido.
create table if not exists public.estoque_cardapio (
  minisite_id uuid not null references public.minisites(id) on delete cascade,
  produto_id text not null,
  quantidade integer not null check (quantidade >= 0),
  updated_at timestamptz not null default now(),
  primary key (minisite_id, produto_id)
);
alter table public.estoque_cardapio enable row level security;
drop policy if exists "owner gerencia estoque cardápio" on public.estoque_cardapio;
create policy "owner gerencia estoque cardápio" on public.estoque_cardapio for all to authenticated
using (exists (select 1 from public.minisites m where m.id=minisite_id and m.owner_id=auth.uid()))
with check (exists (select 1 from public.minisites m where m.id=minisite_id and m.owner_id=auth.uid()));

create or replace function public.nexa_estoque_publico_cardapio(requested_slug text)
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  select coalesce(jsonb_object_agg(e.produto_id, e.quantidade), '{}'::jsonb)
  from public.estoque_cardapio e join public.minisites m on m.id=e.minisite_id
  where m.slug=lower(trim(requested_slug)) and m.status='publicado'
    and (m.expires_at is null or m.expires_at > now())
    and public.nexa_plan_allows_public_site(m.owner_id)
$$;
grant execute on function public.nexa_estoque_publico_cardapio(text) to anon, authenticated;

create or replace function public.nexa_validar_itens_disponiveis_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_conteudo jsonb; v_item jsonb; v_produto jsonb;
  v_inicio time; v_fim time; v_estoque integer; v_quantidade integer;
begin
  select published_content into v_conteudo from public.minisites where id = new.minisite_id;
  for v_item in select value from jsonb_array_elements(new.itens) loop
    select value into v_produto from jsonb_array_elements(coalesce(v_conteudo->'produtos', '[]'::jsonb)) where value->>'id'=v_item->>'produtoId' limit 1;
    if v_produto is null or coalesce((v_produto->>'disponivel')::boolean,true)=false then raise exception 'invalid_product'; end if;
    if coalesce(v_produto->>'disponivelInicio','') ~ '^\d{2}:\d{2}$' and coalesce(v_produto->>'disponivelFim','') ~ '^\d{2}:\d{2}$' then
      v_inicio := (v_produto->>'disponivelInicio')::time; v_fim := (v_produto->>'disponivelFim')::time;
      if not ((v_inicio<=v_fim and localtime between v_inicio and v_fim) or (v_inicio>v_fim and (localtime>=v_inicio or localtime<=v_fim))) then raise exception 'invalid_product'; end if;
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
