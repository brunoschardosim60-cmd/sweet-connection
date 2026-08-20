-- A publication deadline is enforced by every public entry point, not only by the dashboard UI.

alter table public.minisites
  add column if not exists expires_at timestamptz;

create index if not exists minisites_public_expiry_idx
  on public.minisites (slug, expires_at)
  where status = 'publicado';

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
  requested_expires_at timestamptz;
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

  begin
    requested_expires_at := nullif(trim(site_content ->> 'expiraEm'), '')::timestamptz;
  exception when others then
    raise exception 'invalid_expiry_date' using errcode = '22023';
  end;

  if requested_expires_at is not null and requested_expires_at <= now() then
    raise exception 'expiry_must_be_in_the_future' using errcode = '22023';
  end if;

  if requested_id is null then
    insert into public.clients (
      owner_id, company, segment, contact_name, phone, email, city, state
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
      owner_id, client_id, slug, status, expires_at, draft_content
    ) values (
      caller_id, target_client_id, lower(trim(requested_slug)), 'rascunho', requested_expires_at,
      site_content || jsonb_build_object('status', 'rascunho', 'expiraEm', requested_expires_at)
    ) returning * into saved;
  else
    select client_id into target_client_id
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
        expires_at = requested_expires_at,
        draft_content = site_content || jsonb_build_object('expiraEm', requested_expires_at)
    where id = requested_id and owner_id = caller_id
    returning * into saved;
  end if;

  return saved;
end;
$$;

create or replace function public.publish_minisite(requested_id uuid)
returns public.minisites
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  saved public.minisites;
begin
  update public.minisites
  set status = 'publicado',
      published_content = draft_content || jsonb_build_object('status', 'publicado', 'expiraEm', expires_at),
      published_at = now()
  where id = requested_id
    and owner_id = auth.uid()
    and (expires_at is null or expires_at > now())
  returning * into saved;

  if saved.id is null then
    raise exception 'minisite_not_found_or_expired' using errcode = 'P0002';
  end if;

  return saved;
end;
$$;

create or replace function public.get_published_minisite(requested_slug text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select published_content
  from public.minisites
  where slug = lower(trim(requested_slug))
    and status = 'publicado'
    and published_content is not null
    and (expires_at is null or expires_at > now())
  limit 1;
$$;

create or replace function public.submit_minisite_form(
  requested_slug text,
  submitted_payload jsonb,
  request_origin text default 'minisite',
  fingerprint text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_id uuid;
  snapshot jsonb;
  field jsonb;
  field_id text;
  clean_payload jsonb := '{}'::jsonb;
  new_id uuid;
  fingerprint_digest text;
begin
  if jsonb_typeof(submitted_payload) <> 'object'
     or submitted_payload = '{}'::jsonb
     or octet_length(submitted_payload::text) > 16000 then
    raise exception 'invalid_form_payload' using errcode = '22023';
  end if;

  select id, published_content into target_id, snapshot
  from public.minisites
  where slug = lower(trim(requested_slug))
    and status = 'publicado'
    and published_content is not null
    and (expires_at is null or expires_at > now());

  if target_id is null then
    raise exception 'minisite_not_found' using errcode = 'P0002';
  end if;

  for field in select value from jsonb_array_elements(coalesce(snapshot #> '{formulario,campos}', '[]'::jsonb)) loop
    field_id := field ->> 'id';
    if field_id is null then continue; end if;
    if coalesce((field ->> 'obrigatorio')::boolean, false)
       and nullif(trim(submitted_payload ->> field_id), '') is null then
      raise exception 'required_field_missing' using errcode = '22023';
    end if;
    if submitted_payload ? field_id then
      if char_length(coalesce(submitted_payload ->> field_id, '')) > 2000 then
        raise exception 'field_too_long' using errcode = '22023';
      end if;
      clean_payload := clean_payload || jsonb_build_object(
        field_id, left(coalesce(submitted_payload ->> field_id, ''), 2000)
      );
    end if;
  end loop;

  if clean_payload = '{}'::jsonb then
    raise exception 'invalid_form_payload' using errcode = '22023';
  end if;

  fingerprint_digest := case when nullif(fingerprint, '') is null then null
    else encode(extensions.digest(left(fingerprint, 500), 'sha256'), 'hex') end;

  if fingerprint_digest is not null and exists (
    select 1 from public.form_submissions
    where minisite_id = target_id and fingerprint_hash = fingerprint_digest
      and created_at > now() - interval '60 seconds'
  ) then raise exception 'rate_limit_exceeded' using errcode = 'P0001'; end if;

  if fingerprint_digest is not null and (
    select count(*) from public.form_submissions
    where minisite_id = target_id and fingerprint_hash = fingerprint_digest
      and created_at > now() - interval '10 minutes'
  ) >= 3 then raise exception 'rate_limit_exceeded' using errcode = 'P0001'; end if;

  if (select count(*) from public.form_submissions
      where minisite_id = target_id and created_at > now() - interval '5 minutes') >= 60 then
    raise exception 'rate_limit_exceeded' using errcode = 'P0001';
  end if;

  insert into public.form_submissions (minisite_id, payload, origin, fingerprint_hash)
  values (target_id, clean_payload, left(coalesce(request_origin, 'minisite'), 120), fingerprint_digest)
  returning id into new_id;

  insert into public.analytics_events (minisite_id, event_type, target, source, session_hash)
  values (target_id, 'formulario', 'formulario', left(coalesce(request_origin, 'minisite'), 120), fingerprint_digest);
  return new_id;
end;
$$;

create or replace function public.record_minisite_event(
  requested_slug text,
  requested_event public.nexa_event_type,
  requested_target text default null,
  request_source text default null,
  session_fingerprint text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare target_id uuid; session_digest text;
begin
  if requested_event = 'formulario' then
    raise exception 'form_events_are_server_managed' using errcode = '22023';
  end if;
  select id into target_id from public.minisites
  where slug = lower(trim(requested_slug)) and status = 'publicado'
    and published_content is not null and (expires_at is null or expires_at > now());
  if target_id is null then return; end if;
  session_digest := case when nullif(session_fingerprint, '') is null then null
    else encode(extensions.digest(left(session_fingerprint, 500), 'sha256'), 'hex') end;
  if requested_event = 'visita' then
    insert into public.analytics_events (minisite_id, event_type, target, source, session_hash)
    values (target_id, requested_event, left(requested_target, 200), left(request_source, 200), session_digest)
    on conflict do nothing;
  else
    if session_digest is not null and exists (
      select 1 from public.analytics_events
      where minisite_id = target_id and event_type = requested_event and session_hash = session_digest
        and target is not distinct from left(requested_target, 200)
        and occurred_at > now() - interval '2 seconds'
    ) then return; end if;
    insert into public.analytics_events (minisite_id, event_type, target, source, session_hash)
    values (target_id, requested_event, left(requested_target, 200), left(request_source, 200), session_digest);
  end if;
end;
$$;

revoke all on function public.save_minisite_draft(text, jsonb, jsonb, uuid) from public;
grant execute on function public.save_minisite_draft(text, jsonb, jsonb, uuid) to authenticated;
revoke all on function public.publish_minisite(uuid) from public;
grant execute on function public.publish_minisite(uuid) to authenticated;
revoke all on function public.get_published_minisite(text) from public;
grant execute on function public.get_published_minisite(text) to anon, authenticated;
revoke all on function public.submit_minisite_form(text, jsonb, text, text) from public;
grant execute on function public.submit_minisite_form(text, jsonb, text, text) to anon, authenticated;
revoke all on function public.record_minisite_event(text, public.nexa_event_type, text, text, text) from public;
grant execute on function public.record_minisite_event(text, public.nexa_event_type, text, text, text) to anon, authenticated;
