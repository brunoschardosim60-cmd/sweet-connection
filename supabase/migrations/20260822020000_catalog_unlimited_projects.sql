-- O plano Catálogo ativo não limita a quantidade de mini-sites criados ou publicados.
-- Essencial permanece em 1 projeto e Profissional em 3.
create or replace function public.enforce_nexa_minisite_creation_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  tier text;
  active boolean;
  allowed_count integer;
begin
  if public.has_role(new.owner_id, 'admin') then return new; end if;

  select subscription_tier, subscription_status = 'active'
    into tier, active
    from public.profiles
   where id = new.owner_id;

  if coalesce(active, false) and tier = 'catalog' then
    return new;
  end if;

  allowed_count := case when coalesce(active, false) and tier = 'professional' then 3 else 1 end;
  if (select count(*) from public.minisites where owner_id = new.owner_id) >= allowed_count then
    raise exception 'minisite_creation_limit_reached' using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.publish_minisite(requested_id uuid)
returns public.minisites
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  saved public.minisites;
  caller uuid := auth.uid();
  site_limit integer;
  tier text;
  draft jsonb;
  admin boolean;
begin
  if caller is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if not public.nexa_plan_allows_publish(caller) then
    raise exception 'subscription_required' using errcode = '42501';
  end if;

  admin := public.has_role(caller, 'admin');
  select subscription_tier into tier from public.profiles where id = caller;
  select draft_content into draft
    from public.minisites
   where id = requested_id and owner_id = caller;
  if draft is null then raise exception 'minisite_not_found_or_expired' using errcode = 'P0002'; end if;

  if tier = 'essential' and not admin and exists (
    select 1 from jsonb_array_elements(coalesce(draft->'secoes', '[]'::jsonb)) secao
    where coalesce((secao->>'ativa')::boolean, false)
      and secao->>'tipo' in ('servicos', 'galeria', 'videos', 'depoimentos', 'equipe', 'agenda')
  ) then
    raise exception 'professional_feature_required' using errcode = '42501';
  end if;

  if tier <> 'catalog' and not admin and (
    exists (
      select 1 from jsonb_array_elements(coalesce(draft->'secoes', '[]'::jsonb)) secao
      where coalesce((secao->>'ativa')::boolean, false)
        and secao->>'tipo' in ('produtos', 'cardapio', 'cupom', 'promocao')
    )
    or coalesce(jsonb_array_length(draft->'produtos'), 0) > 0
    or coalesce((draft->'comercio'->>'carrinho')::boolean, false)
  ) then
    raise exception 'catalog_feature_required' using errcode = '42501';
  end if;

  site_limit := case tier when 'essential' then 1 when 'professional' then 3 else null end;
  if site_limit is not null and not admin and (
    select count(*) from public.minisites
    where owner_id = caller and status = 'publicado' and id <> requested_id
  ) >= site_limit then
    raise exception 'published_site_limit_reached' using errcode = '42501';
  end if;

  update public.minisites
  set status = 'publicado',
      published_content = draft_content || jsonb_build_object('status', 'publicado', 'expiraEm', expires_at),
      published_at = now()
  where id = requested_id and owner_id = caller and (expires_at is null or expires_at > now())
  returning * into saved;

  if saved.id is null then raise exception 'minisite_not_found_or_expired' using errcode = 'P0002'; end if;
  return saved;
end;
$$;
