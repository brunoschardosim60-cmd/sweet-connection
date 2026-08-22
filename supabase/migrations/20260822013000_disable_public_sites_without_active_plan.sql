-- Um projeto pode permanecer salvo como rascunho sem plano, mas a versão
-- pública só é servida enquanto a assinatura estiver ativa. A regra fica no
-- banco para valer mesmo se a interface ou o webhook forem contornados.
create or replace function public.nexa_plan_allows_public_site(requested_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.has_role(requested_user_id, 'admin') or exists (
    select 1
    from public.profiles p
    where p.id = requested_user_id
      and p.subscription_status = 'active'
      and p.subscription_tier <> 'none'
      and (
        not p.billing_cancel_at_period_end
        or p.billing_current_period_end is null
        or p.billing_current_period_end > now()
      )
  );
$$;

revoke all on function public.nexa_plan_allows_public_site(uuid) from public;
grant execute on function public.nexa_plan_allows_public_site(uuid) to anon, authenticated, service_role;

-- Toda rota pública obtém o snapshot por esta função. Assim, quando a cobrança
-- vence, é cancelada ou o período já pago termina, o endereço /site/slug deixa
-- de existir publicamente sem apagar o rascunho do cliente.
create or replace function public.get_published_minisite(requested_slug text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    (m.published_content - 'metricas') || jsonb_build_object(
      'cliente',
        coalesce(m.published_content -> 'cliente', '{}'::jsonb)
          - 'email' - 'telefone' - 'responsavel',
      'integracoes',
        coalesce(m.published_content -> 'integracoes', '{}'::jsonb)
          - 'dominio' - 'googleMaps' - 'whatsappApi'
    )
  from public.minisites m
  where m.slug = lower(trim(requested_slug))
    and m.status = 'publicado'
    and m.published_content is not null
    and (m.expires_at is null or m.expires_at > now())
    and public.nexa_plan_allows_public_site(m.owner_id)
  limit 1;
$$;

revoke all on function public.get_published_minisite(text) from public;
grant execute on function public.get_published_minisite(text) to anon, authenticated;
