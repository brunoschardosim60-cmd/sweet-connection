-- Harden public entry points and remove direct profile-role mutation.

create index if not exists form_submissions_fingerprint_rate_idx
  on public.form_submissions (minisite_id, fingerprint_hash, created_at desc)
  where fingerprint_hash is not null;

create index if not exists analytics_events_session_rate_idx
  on public.analytics_events (minisite_id, session_hash, event_type, occurred_at desc)
  where session_hash is not null;

drop policy if exists profiles_update_self on public.profiles;
revoke update on table public.profiles from authenticated;

create or replace function public.update_nexa_profile(requested_display_name text)
returns public.profiles
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  updated_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  update public.profiles
  set display_name = left(trim(coalesce(requested_display_name, '')), 120)
  where id = auth.uid()
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  return updated_profile;
end;
$$;

revoke all on function public.update_nexa_profile(text) from public;
grant execute on function public.update_nexa_profile(text) to authenticated;

alter table public.media
  add constraint media_bucket_fixed check (bucket = 'nexa-media'),
  add constraint media_owner_path check (object_path like owner_id::text || '/%');

comment on table public.media is
  'Public website assets only. Read access uses unguessable public URLs; never store confidential documents in this bucket.';

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

  if fingerprint_digest is not null and (
    select count(*) from public.form_submissions
    where minisite_id = target_id
      and fingerprint_hash = fingerprint_digest
      and created_at > now() - interval '10 minutes'
  ) >= 3 then
    raise exception 'rate_limit_exceeded' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.form_submissions
    where minisite_id = target_id
      and created_at > now() - interval '5 minutes'
  ) >= 60 then
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
    minisite_id, event_type, target, source, session_hash
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
set search_path = pg_catalog, public
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

alter function public.get_published_minisite(text)
  set search_path = pg_catalog, public;
alter function public.handle_new_nexa_user()
  set search_path = pg_catalog, public;

revoke all on function public.submit_minisite_form(text, jsonb, text, text) from public;
grant execute on function public.submit_minisite_form(text, jsonb, text, text) to anon, authenticated;

revoke all on function public.record_minisite_event(
  text, public.nexa_event_type, text, text, text
) from public;
grant execute on function public.record_minisite_event(
  text, public.nexa_event_type, text, text, text
) to anon, authenticated;
