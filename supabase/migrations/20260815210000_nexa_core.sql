-- Nexa core schema for the external Supabase project.
-- Apply with the Supabase CLI or SQL editor. Never expose a service-role key.

create extension if not exists pgcrypto;

create type public.nexa_site_status as enum ('rascunho', 'publicado', 'pausado');
create type public.nexa_submission_status as enum ('novo', 'lido', 'arquivado');
create type public.nexa_event_type as enum ('visita', 'clique', 'whatsapp', 'formulario');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'owner' check (role in ('owner', 'support')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company text not null,
  segment text not null,
  contact_name text not null default '',
  phone text not null default '',
  email text not null default '',
  city text not null default '',
  state text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_id_owner_unique unique (id, owner_id)
);

create table public.minisites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid not null,
  slug text not null,
  status public.nexa_site_status not null default 'rascunho',
  draft_content jsonb not null,
  published_content jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint minisites_client_owner_fk
    foreign key (client_id, owner_id) references public.clients(id, owner_id) on delete cascade,
  constraint minisites_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint minisites_slug_length check (char_length(slug) between 3 and 48),
  constraint minisites_slug_unique unique (slug),
  constraint published_content_required check (
    status <> 'publicado' or published_content is not null
  )
);

create table public.platform_settings (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  minisite_id uuid not null references public.minisites(id) on delete cascade,
  payload jsonb not null,
  origin text not null default 'minisite',
  status public.nexa_submission_status not null default 'novo',
  fingerprint_hash text,
  created_at timestamptz not null default now(),
  constraint submission_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint submission_payload_size check (octet_length(payload::text) <= 16000)
);

create index form_submissions_minisite_created_idx
  on public.form_submissions (minisite_id, created_at desc);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bucket text not null default 'nexa-media',
  object_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  minisite_id uuid not null references public.minisites(id) on delete cascade,
  event_type public.nexa_event_type not null,
  target text,
  source text,
  visitor_hash text,
  session_hash text,
  occurred_at timestamptz not null default now()
);

create index analytics_events_minisite_date_idx
  on public.analytics_events (minisite_id, occurred_at desc);
create unique index analytics_unique_visit_per_session_day
  on public.analytics_events (minisite_id, session_hash, ((occurred_at at time zone 'utc')::date))
  where event_type = 'visita' and session_hash is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger clients_updated_at before update on public.clients
for each row execute function public.set_updated_at();
create trigger minisites_updated_at before update on public.minisites
for each row execute function public.set_updated_at();
create trigger platform_settings_updated_at before update on public.platform_settings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_nexa_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 120), 'owner')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_nexa_user();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.minisites enable row level security;
alter table public.platform_settings enable row level security;
alter table public.form_submissions enable row level security;
alter table public.media enable row level security;
alter table public.analytics_events enable row level security;

create policy profiles_read_self on public.profiles
for select to authenticated using (id = auth.uid());
create policy profiles_update_self on public.profiles
for update to authenticated using (id = auth.uid())
with check (id = auth.uid() and role = 'owner');

create policy clients_owner_all on public.clients
for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy minisites_owner_all on public.minisites
for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy settings_owner_all on public.platform_settings
for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy submissions_owner_all on public.form_submissions
for all to authenticated
using (
  exists (
    select 1 from public.minisites
    where minisites.id = form_submissions.minisite_id
      and minisites.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.minisites
    where minisites.id = form_submissions.minisite_id
      and minisites.owner_id = auth.uid()
  )
);
create policy media_owner_all on public.media
for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy analytics_owner_read on public.analytics_events
for select to authenticated
using (
  exists (
    select 1 from public.minisites
    where minisites.id = analytics_events.minisite_id
      and minisites.owner_id = auth.uid()
  )
);

-- Public visitors receive only the last published snapshot, never draft content.
create or replace function public.get_published_minisite(requested_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select published_content
  from public.minisites
  where slug = lower(trim(requested_slug))
    and status = 'publicado'
    and published_content is not null
  limit 1;
$$;

revoke all on function public.get_published_minisite(text) from public;
grant execute on function public.get_published_minisite(text) to anon, authenticated;

-- Public form submissions go through validation without direct table privileges.
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
  new_id uuid;
begin
  if jsonb_typeof(submitted_payload) <> 'object'
     or submitted_payload = '{}'::jsonb
     or octet_length(submitted_payload::text) > 16000 then
    raise exception 'invalid_form_payload' using errcode = '22023';
  end if;

  select id into target_id
  from public.minisites
  where slug = lower(trim(requested_slug))
    and status = 'publicado'
    and published_content is not null;

  if target_id is null then
    raise exception 'minisite_not_found' using errcode = 'P0002';
  end if;

  if fingerprint is not null and exists (
    select 1 from public.form_submissions
    where minisite_id = target_id
      and fingerprint_hash = encode(digest(fingerprint, 'sha256'), 'hex')
      and created_at > now() - interval '60 seconds'
  ) then
    raise exception 'rate_limit_exceeded' using errcode = 'P0001';
  end if;

  insert into public.form_submissions (minisite_id, payload, origin, fingerprint_hash)
  values (
    target_id,
    submitted_payload,
    left(coalesce(request_origin, 'minisite'), 120),
    case
      when fingerprint is null then null
      else encode(digest(fingerprint, 'sha256'), 'hex')
    end
  ) returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.submit_minisite_form(text, jsonb, text, text) from public;
grant execute on function public.submit_minisite_form(text, jsonb, text, text) to anon, authenticated;

-- Files stay private. The app must request short-lived signed URLs after authorization.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nexa-media',
  'nexa-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy nexa_media_owner_select on storage.objects
for select to authenticated
using (bucket_id = 'nexa-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy nexa_media_owner_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'nexa-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy nexa_media_owner_update on storage.objects
for update to authenticated
using (bucket_id = 'nexa-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'nexa-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy nexa_media_owner_delete on storage.objects
for delete to authenticated
using (bucket_id = 'nexa-media' and (storage.foldername(name))[1] = auth.uid()::text);
