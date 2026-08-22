-- Public pages only need public-facing content. Do not serialize the account's
-- client contact details or unused integration values into the visitor payload.
create or replace function public.get_published_minisite(requested_slug text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    (published_content - 'metricas') || jsonb_build_object(
      'cliente',
        coalesce(published_content -> 'cliente', '{}'::jsonb)
          - 'email' - 'telefone' - 'responsavel',
      'integracoes',
        coalesce(published_content -> 'integracoes', '{}'::jsonb)
          - 'dominio' - 'googleMaps' - 'whatsappApi'
    )
  from public.minisites
  where slug = lower(trim(requested_slug))
    and status = 'publicado'
    and published_content is not null
    and (expires_at is null or expires_at > now())
  limit 1;
$$;

revoke all on function public.get_published_minisite(text) from public;
grant execute on function public.get_published_minisite(text) to anon, authenticated;
