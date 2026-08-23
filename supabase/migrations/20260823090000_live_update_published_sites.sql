-- Salvar um projeto já publicado também atualiza a cópia pública.
-- Projetos em rascunho continuam isolados: nada fica visível antes da primeira publicação.
create or replace function public.save_minisite_draft(
  requested_slug text,
  site_content jsonb,
  client_content jsonb,
  requested_id uuid default null
)
returns public.minisites
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  target_client_id uuid;
  target_status public.nexa_site_status;
  requested_expires_at timestamptz;
  saved public.minisites;
  tier text;
  active boolean;
  admin boolean;
  normalized_content jsonb;
begin
  if caller_id is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if jsonb_typeof(site_content) <> 'object' or jsonb_typeof(client_content) <> 'object'
    or nullif(trim(client_content ->> 'company'), '') is null then
    raise exception 'invalid_minisite_payload' using errcode = '22023';
  end if;

  select subscription_tier, subscription_status = 'active' into tier, active
  from public.profiles where id = caller_id;
  admin := public.has_role(caller_id, 'admin');
  if coalesce((site_content ->> 'mostrarAssinaturaNexa')::boolean, true) = false
    and not admin and not (tier = 'catalog' and coalesce(active, false)) then
    raise exception 'white_label_requires_catalog' using errcode = '42501';
  end if;

  begin
    requested_expires_at := nullif(trim(site_content ->> 'expiraEm'), '')::timestamptz;
  exception when others then
    raise exception 'invalid_expiry_date' using errcode = '22023';
  end;
  if requested_expires_at is not null and requested_expires_at <= now() then
    raise exception 'expiry_must_be_in_the_future' using errcode = '22023';
  end if;

  normalized_content := site_content || jsonb_build_object('expiraEm', requested_expires_at);

  if requested_id is null then
    insert into public.clients (owner_id, company, segment, contact_name, phone, email, city, state)
    values (
      caller_id,
      left(trim(client_content ->> 'company'), 160),
      left(coalesce(client_content ->> 'segment', 'servicos'), 80),
      left(coalesce(client_content ->> 'contact_name', ''), 160),
      left(coalesce(client_content ->> 'phone', ''), 40),
      left(coalesce(client_content ->> 'email', ''), 254),
      left(coalesce(client_content ->> 'city', ''), 120),
      left(coalesce(client_content ->> 'state', ''), 40)
    ) returning id into target_client_id;

    insert into public.minisites (owner_id, client_id, slug, status, expires_at, draft_content)
    values (
      caller_id, target_client_id, lower(trim(requested_slug)), 'rascunho', requested_expires_at,
      normalized_content || jsonb_build_object('status', 'rascunho')
    ) returning * into saved;
  else
    select client_id, status into target_client_id, target_status
    from public.minisites
    where id = requested_id and owner_id = caller_id
    for update;

    if target_client_id is null then raise exception 'minisite_not_found' using errcode = 'P0002'; end if;

    update public.clients
    set company = left(trim(client_content ->> 'company'), 160),
        segment = left(coalesce(client_content ->> 'segment', 'servicos'), 80),
        contact_name = left(coalesce(client_content ->> 'contact_name', ''), 160),
        phone = left(coalesce(client_content ->> 'phone', ''), 40),
        email = left(coalesce(client_content ->> 'email', ''), 254),
        city = left(coalesce(client_content ->> 'city', ''), 120),
        state = left(coalesce(client_content ->> 'state', ''), 40)
    where id = target_client_id and owner_id = caller_id;

    update public.minisites
    set slug = lower(trim(requested_slug)),
        expires_at = requested_expires_at,
        draft_content = normalized_content || jsonb_build_object('status', target_status),
        published_content = case
          when target_status = 'publicado'
            then normalized_content || jsonb_build_object('status', 'publicado')
          else published_content
        end
    where id = requested_id and owner_id = caller_id
    returning * into saved;
  end if;

  return saved;
end;
$$;

revoke all on function public.save_minisite_draft(text, jsonb, jsonb, uuid) from public;
grant execute on function public.save_minisite_draft(text, jsonb, jsonb, uuid) to authenticated;
