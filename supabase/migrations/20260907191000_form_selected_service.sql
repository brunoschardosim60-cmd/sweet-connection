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

  -- Preserva o contexto do CTA somente se o serviço existe no site publicado.
  if nullif(trim(submitted_payload ->> 'servico_interesse'), '') is not null
     and exists (
       select 1 from jsonb_array_elements(coalesce(snapshot -> 'servicos', '[]'::jsonb)) servico
       where servico ->> 'nome' = submitted_payload ->> 'servico_interesse'
     ) then
    clean_payload := clean_payload || jsonb_build_object(
      'servico_interesse', left(submitted_payload ->> 'servico_interesse', 200)
    );
  end if;

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
