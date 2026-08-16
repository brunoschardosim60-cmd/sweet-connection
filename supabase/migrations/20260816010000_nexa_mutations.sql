-- Transactional mutations used by the dashboard. All functions run as the
-- authenticated caller, so the existing RLS policies remain authoritative.

create or replace function public.save_minisite_draft(
  requested_slug text,
  site_content jsonb,
  client_content jsonb,
  requested_id uuid default null
)
returns public.minisites
language plpgsql
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  target_client_id uuid;
  saved public.minisites;
begin
  if caller_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if jsonb_typeof(site_content) <> 'object'
     or jsonb_typeof(client_content) <> 'object'
     or nullif(trim(client_content ->> 'company'), '') is null then
    raise exception 'invalid_minisite_payload' using errcode = '22023';
  end if;

  if requested_id is null then
    insert into public.clients (
      owner_id,
      company,
      segment,
      contact_name,
      phone,
      email,
      city,
      state
    ) values (
      caller_id,
      left(trim(client_content ->> 'company'), 160),
      left(coalesce(client_content ->> 'segment', 'servicos'), 80),
      left(coalesce(client_content ->> 'contact_name', ''), 160),
      left(coalesce(client_content ->> 'phone', ''), 40),
      left(coalesce(client_content ->> 'email', ''), 254),
      left(coalesce(client_content ->> 'city', ''), 120),
      left(coalesce(client_content ->> 'state', ''), 40)
    ) returning id into target_client_id;

    insert into public.minisites (
      owner_id,
      client_id,
      slug,
      status,
      draft_content
    ) values (
      caller_id,
      target_client_id,
      lower(trim(requested_slug)),
      'rascunho',
      site_content || jsonb_build_object('status', 'rascunho')
    ) returning * into saved;
  else
    select client_id
      into target_client_id
      from public.minisites
      where id = requested_id and owner_id = caller_id
      for update;

    if target_client_id is null then
      raise exception 'minisite_not_found' using errcode = 'P0002';
    end if;

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
          draft_content = site_content
      where id = requested_id and owner_id = caller_id
      returning * into saved;
  end if;

  return saved;
end;
$$;

create or replace function public.publish_minisite(requested_id uuid)
returns public.minisites
language plpgsql
set search_path = public
as $$
declare
  saved public.minisites;
begin
  update public.minisites
    set status = 'publicado',
        published_content = draft_content || jsonb_build_object('status', 'publicado'),
        published_at = now()
    where id = requested_id and owner_id = auth.uid()
    returning * into saved;

  if saved.id is null then
    raise exception 'minisite_not_found' using errcode = 'P0002';
  end if;

  return saved;
end;
$$;

create or replace function public.set_minisite_status(
  requested_id uuid,
  requested_status public.nexa_site_status
)
returns public.minisites
language plpgsql
set search_path = public
as $$
declare
  saved public.minisites;
begin
  if requested_status = 'publicado' then
    raise exception 'use_publish_minisite' using errcode = '22023';
  end if;

  update public.minisites
    set status = requested_status,
        draft_content = draft_content || jsonb_build_object('status', requested_status)
    where id = requested_id and owner_id = auth.uid()
    returning * into saved;

  if saved.id is null then
    raise exception 'minisite_not_found' using errcode = 'P0002';
  end if;

  return saved;
end;
$$;

create or replace function public.delete_minisite(requested_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  target_client_id uuid;
begin
  select client_id into target_client_id
  from public.minisites
  where id = requested_id and owner_id = auth.uid();

  if target_client_id is null then
    raise exception 'minisite_not_found' using errcode = 'P0002';
  end if;

  -- Deleting the client cascades to its minisite and related submissions/events.
  delete from public.clients where id = target_client_id and owner_id = auth.uid();
end;
$$;

create or replace function public.clear_nexa_account()
returns void
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  delete from public.clients where owner_id = auth.uid();
  delete from public.media where owner_id = auth.uid();
  delete from public.platform_settings where owner_id = auth.uid();
end;
$$;

revoke all on function public.save_minisite_draft(text, jsonb, jsonb, uuid) from public;
revoke all on function public.publish_minisite(uuid) from public;
revoke all on function public.set_minisite_status(uuid, public.nexa_site_status) from public;
revoke all on function public.delete_minisite(uuid) from public;
revoke all on function public.clear_nexa_account() from public;

grant execute on function public.save_minisite_draft(text, jsonb, jsonb, uuid) to authenticated;
grant execute on function public.publish_minisite(uuid) to authenticated;
grant execute on function public.set_minisite_status(uuid, public.nexa_site_status) to authenticated;
grant execute on function public.delete_minisite(uuid) to authenticated;
grant execute on function public.clear_nexa_account() to authenticated;
