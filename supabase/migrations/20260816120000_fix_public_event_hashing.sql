-- Qualify pgcrypto hashing inside security-definer functions. The extension
-- lives in the `extensions` schema on hosted Supabase projects, while these
-- functions intentionally keep a restricted `search_path`.

create or replace function public.submit_minisite_form(
  requested_slug text,
  submitted_payload jsonb,
  request_origin text default 'minisite',
  fingerprint text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
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
    and published_content is not null;

  if target_id is null then
    raise exception 'minisite_not_found' using errcode = 'P0002';
  end if;

  for field in
    select value
    from jsonb_array_elements(coalesce(snapshot #> '{formulario,campos}', '[]'::jsonb))
  loop
    field_id := field ->> 'id';
    if field_id is null then
      continue;
    end if;

    if coalesce((field ->> 'obrigatorio')::boolean, false)
       and nullif(trim(submitted_payload ->> field_id), '') is null then
      raise exception 'required_field_missing' using errcode = '22023';
    end if;

    if submitted_payload ? field_id then
      if char_length(coalesce(submitted_payload ->> field_id, '')) > 2000 then
        raise exception 'field_too_long' using errcode = '22023';
      end if;
      clean_payload := clean_payload || jsonb_build_object(
        field_id,
        left(coalesce(submitted_payload ->> field_id, ''), 2000)
      );
    end if;
  end loop;

  if clean_payload = '{}'::jsonb then
    raise exception 'invalid_form_payload' using errcode = '22023';
  end if;

  fingerprint_digest := case
    when nullif(fingerprint, '') is null then null
    else encode(extensions.digest(left(fingerprint, 500), 'sha256'), 'hex')
  end;

  if fingerprint_digest is not null and exists (
    select 1 from public.form_submissions
    where minisite_id = target_id
      and fingerprint_hash = fingerprint_digest
      and created_at > now() - interval '60 seconds'
  ) then
    raise exception 'rate_limit_exceeded' using errcode = 'P0001';
  end if;

  insert into public.form_submissions (minisite_id, payload, origin, fingerprint_hash)
  values (
    target_id,
    clean_payload,
    left(coalesce(request_origin, 'minisite'), 120),
    fingerprint_digest
  ) returning id into new_id;

  insert into public.analytics_events (
    minisite_id,
    event_type,
    target,
    source,
    session_hash
  ) values (
    target_id,
    'formulario',
    'formulario',
    left(coalesce(request_origin, 'minisite'), 120),
    fingerprint_digest
  );

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
set search_path = public
as $$
declare
  target_id uuid;
  session_digest text;
begin
  if requested_event = 'formulario' then
    raise exception 'form_events_are_server_managed' using errcode = '22023';
  end if;

  select id into target_id
  from public.minisites
  where slug = lower(trim(requested_slug))
    and status = 'publicado'
    and published_content is not null;

  if target_id is null then
    return;
  end if;

  session_digest := case
    when nullif(session_fingerprint, '') is null then null
    else encode(extensions.digest(left(session_fingerprint, 500), 'sha256'), 'hex')
  end;

  if requested_event = 'visita' then
    insert into public.analytics_events (
      minisite_id, event_type, target, source, session_hash
    ) values (
      target_id,
      requested_event,
      left(requested_target, 200),
      left(request_source, 200),
      session_digest
    ) on conflict do nothing;
  else
    if session_digest is not null and exists (
      select 1 from public.analytics_events
      where minisite_id = target_id
        and event_type = requested_event
        and session_hash = session_digest
        and target is not distinct from left(requested_target, 200)
        and occurred_at > now() - interval '2 seconds'
    ) then
      return;
    end if;

    insert into public.analytics_events (
      minisite_id, event_type, target, source, session_hash
    ) values (
      target_id,
      requested_event,
      left(requested_target, 200),
      left(request_source, 200),
      session_digest
    );
  end if;
end;
$$;

revoke all on function public.submit_minisite_form(text, jsonb, text, text) from public;
grant execute on function public.submit_minisite_form(text, jsonb, text, text) to anon, authenticated;

revoke all on function public.record_minisite_event(
  text, public.nexa_event_type, text, text, text
) from public;
grant execute on function public.record_minisite_event(
  text, public.nexa_event_type, text, text, text
) to anon, authenticated;
