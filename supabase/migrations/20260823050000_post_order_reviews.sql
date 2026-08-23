create table if not exists public.avaliacoes_cardapio (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null unique references public.pedidos_cardapio(id) on delete cascade,
  minisite_id uuid not null references public.minisites(id) on delete cascade,
  nota smallint not null check (nota between 1 and 5),
  comentario text not null default '' check (char_length(comentario) <= 800),
  status text not null default 'pendente' check (status in ('pendente','aprovada','oculta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.avaliacoes_cardapio enable row level security;

drop policy if exists "owner lê avaliações do cardápio" on public.avaliacoes_cardapio;
create policy "owner lê avaliações do cardápio" on public.avaliacoes_cardapio for select to authenticated
using (exists (select 1 from public.minisites m where m.id = minisite_id and m.owner_id = auth.uid()));
drop policy if exists "owner modera avaliações do cardápio" on public.avaliacoes_cardapio;
create policy "owner modera avaliações do cardápio" on public.avaliacoes_cardapio for update to authenticated
using (exists (select 1 from public.minisites m where m.id = minisite_id and m.owner_id = auth.uid()))
with check (exists (select 1 from public.minisites m where m.id = minisite_id and m.owner_id = auth.uid()));

create or replace function public.nexa_meus_pedidos_cardapio(requested_slug text, requested_tokens uuid[])
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'codigo', p.codigo, 'status', p.status, 'modalidade', p.modalidade,
    'total', p.total, 'createdAt', p.created_at, 'updatedAt', p.updated_at,
    'itens', p.itens, 'trackingToken', p.tracking_token
  ) order by p.created_at desc), '[]'::jsonb)
  from public.pedidos_cardapio p
  join public.minisites m on m.id = p.minisite_id
  where m.slug = lower(trim(requested_slug))
    and m.status = 'publicado'
    and (m.expires_at is null or m.expires_at > now())
    and public.nexa_plan_allows_public_site(m.owner_id)
    and cardinality(coalesce(requested_tokens, '{}'::uuid[])) between 1 and 20
    and p.tracking_token = any(coalesce(requested_tokens, '{}'::uuid[]))
$$;
grant execute on function public.nexa_meus_pedidos_cardapio(text,uuid[]) to anon, authenticated;

create or replace function public.nexa_avaliar_pedido_cardapio(
  requested_slug text, requested_token uuid, requested_nota smallint, requested_comentario text default ''
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pedido record;
begin
  if requested_nota not between 1 and 5 then raise exception 'invalid_rating'; end if;
  select p.id, p.minisite_id into v_pedido
  from public.pedidos_cardapio p join public.minisites m on m.id=p.minisite_id
  where m.slug=lower(trim(requested_slug)) and p.tracking_token=requested_token and p.status='concluido'
  limit 1;
  if not found then raise exception 'order_not_eligible'; end if;
  insert into public.avaliacoes_cardapio(pedido_id,minisite_id,nota,comentario)
  values(v_pedido.id,v_pedido.minisite_id,requested_nota,left(trim(coalesce(requested_comentario,'')),800))
  on conflict (pedido_id) do nothing;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.nexa_avaliar_pedido_cardapio(text,uuid,smallint,text) from public;
grant execute on function public.nexa_avaliar_pedido_cardapio(text,uuid,smallint,text) to anon, authenticated;
