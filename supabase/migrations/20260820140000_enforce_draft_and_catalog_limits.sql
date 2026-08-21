-- Enforce commercial limits in the database, including callers that bypass the UI.
create or replace function public.enforce_nexa_minisite_creation_limit()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare tier text; active boolean; allowed_count integer;
begin
  if public.has_role(new.owner_id, 'admin') then return new; end if;
  select subscription_tier, subscription_status = 'active' into tier, active from public.profiles where id = new.owner_id;
  allowed_count := case when coalesce(active,false) and tier in ('professional','catalog') then 3 else 1 end;
  if (select count(*) from public.minisites where owner_id = new.owner_id) >= allowed_count then
    raise exception 'minisite_creation_limit_reached' using errcode = '42501';
  end if;
  return new;
end; $$;
drop trigger if exists enforce_nexa_minisite_creation_limit on public.minisites;
create trigger enforce_nexa_minisite_creation_limit before insert on public.minisites
for each row execute function public.enforce_nexa_minisite_creation_limit();

create or replace function public.publish_minisite(requested_id uuid)
returns public.minisites language plpgsql set search_path = pg_catalog, public as $$
declare saved public.minisites; caller uuid := auth.uid(); site_limit integer; tier text; draft jsonb;
begin
  if caller is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if not public.nexa_plan_allows_publish(caller) then raise exception 'subscription_required' using errcode = '42501'; end if;
  select subscription_tier into tier from public.profiles where id=caller;
  select draft_content into draft from public.minisites where id=requested_id and owner_id=caller;
  if tier <> 'catalog' and not public.has_role(caller, 'admin') and exists (
    select 1 from jsonb_array_elements(coalesce(draft->'secoes','[]'::jsonb)) s
    where coalesce((s->>'ativa')::boolean,false) and s->>'tipo' in ('cardapio','cupom','promocao')
  ) then raise exception 'catalog_feature_required' using errcode = '42501'; end if;
  site_limit := case tier when 'essential' then 1 else 3 end;
  if not public.has_role(caller, 'admin') and (select count(*) from public.minisites where owner_id=caller and status='publicado' and id<>requested_id)>=site_limit then raise exception 'published_site_limit_reached' using errcode='42501'; end if;
  update public.minisites set status='publicado', published_content=draft_content || jsonb_build_object('status','publicado','expiraEm',expires_at), published_at=now() where id=requested_id and owner_id=caller and (expires_at is null or expires_at>now()) returning * into saved;
  if saved.id is null then raise exception 'minisite_not_found_or_expired' using errcode='P0002'; end if;
  return saved;
end; $$;
