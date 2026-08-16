-- Persistent media library and version history.

alter table public.media
  add column original_name text not null default '';

update storage.buckets
set public = true
where id = 'nexa-media';

alter table public.minisites
  add constraint minisites_id_owner_unique unique (id, owner_id);

create table public.minisite_versions (
  id uuid primary key default gen_random_uuid(),
  minisite_id uuid not null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  origin text not null check (origin in ('manual', 'salvamento', 'publicacao', 'importacao')),
  label text not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  constraint versions_minisite_owner_fk
    foreign key (minisite_id, owner_id)
    references public.minisites(id, owner_id)
    on delete cascade,
  constraint versions_content_object check (jsonb_typeof(content) = 'object')
);

create index minisite_versions_site_created_idx
  on public.minisite_versions (minisite_id, created_at desc);

alter table public.minisite_versions enable row level security;

create policy versions_owner_all on public.minisite_versions
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create or replace function public.save_minisite_version(
  requested_site_id uuid,
  requested_origin text,
  requested_label text,
  requested_content jsonb
)
returns public.minisite_versions
language plpgsql
set search_path = public
as $$
declare
  saved public.minisite_versions;
begin
  if requested_origin not in ('manual', 'salvamento', 'publicacao', 'importacao')
     or jsonb_typeof(requested_content) <> 'object' then
    raise exception 'invalid_version' using errcode = '22023';
  end if;

  insert into public.minisite_versions (
    minisite_id, owner_id, origin, label, content
  ) values (
    requested_site_id,
    auth.uid(),
    requested_origin,
    left(coalesce(nullif(trim(requested_label), ''), 'Versão'), 160),
    requested_content
  ) returning * into saved;

  delete from public.minisite_versions
  where id in (
    select id
    from public.minisite_versions
    where minisite_id = requested_site_id and owner_id = auth.uid()
    order by created_at desc
    offset 20
  );

  return saved;
end;
$$;

revoke all on function public.save_minisite_version(uuid, text, text, jsonb) from public;
grant execute on function public.save_minisite_version(uuid, text, text, jsonb) to authenticated;
