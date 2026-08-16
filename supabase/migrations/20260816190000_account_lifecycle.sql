-- Complete account deletion and conservative inactivity lifecycle.
-- Accounts are scheduled after 180 days without dashboard activity and become
-- eligible for deletion only after a further 30-day grace period.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

alter table public.profiles
  add column last_active_at timestamptz not null default now(),
  add column deletion_scheduled_at timestamptz,
  add column cleanup_claimed_at timestamptz;

create index profiles_inactive_cleanup_idx
  on public.profiles (deletion_scheduled_at, last_active_at)
  where deletion_scheduled_at is not null;

create or replace function public.touch_nexa_activity()
returns public.profiles
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  touched public.profiles;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  update public.profiles
  set last_active_at = now(),
      deletion_scheduled_at = null,
      cleanup_claimed_at = null
  where id = auth.uid()
    and (
      last_active_at < now() - interval '1 hour'
      or deletion_scheduled_at is not null
      or cleanup_claimed_at is not null
    )
  returning * into touched;

  if touched.id is null then
    select * into touched from public.profiles where id = auth.uid();
  end if;

  return touched;
end;
$$;

create or replace function public.delete_nexa_account()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  delete from auth.users where id = caller_id;
  if not found then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'nexa_inactive_cleanup_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'nexa_inactive_cleanup_secret',
      'Authorizes the scheduled Nexa inactive-account cleanup Edge Function'
    );
  end if;
end;
$$;

create or replace function public.claim_nexa_accounts_for_cleanup(requested_secret text)
returns table (user_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public, vault
as $$
declare
  expected_secret text;
begin
  select decrypted_secret into expected_secret
  from vault.decrypted_secrets
  where name = 'nexa_inactive_cleanup_secret';

  if expected_secret is null
     or requested_secret is null
     or requested_secret <> expected_secret then
    raise exception 'invalid_cleanup_secret' using errcode = '42501';
  end if;

  update public.profiles
  set deletion_scheduled_at = now() + interval '30 days'
  where deletion_scheduled_at is null
    and last_active_at <= now() - interval '180 days';

  return query
  update public.profiles
  set cleanup_claimed_at = now()
  where id in (
    select p.id
    from public.profiles p
    where p.deletion_scheduled_at <= now()
      and p.last_active_at <= now() - interval '180 days'
      and (
        p.cleanup_claimed_at is null
        or p.cleanup_claimed_at <= now() - interval '1 hour'
      )
    order by p.deletion_scheduled_at
    limit 100
    for update skip locked
  )
  returning profiles.id;
end;
$$;

create or replace function public.confirm_nexa_account_cleanup(
  requested_user_id uuid,
  requested_secret text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, vault
as $$
declare
  expected_secret text;
begin
  select decrypted_secret into expected_secret
  from vault.decrypted_secrets
  where name = 'nexa_inactive_cleanup_secret';

  if expected_secret is null
     or requested_secret is null
     or requested_secret <> expected_secret then
    raise exception 'invalid_cleanup_secret' using errcode = '42501';
  end if;

  return exists (
    select 1
    from public.profiles
    where id = requested_user_id
      and deletion_scheduled_at <= now()
      and last_active_at <= now() - interval '180 days'
      and cleanup_claimed_at > now() - interval '1 hour'
  );
end;
$$;

revoke all on function public.touch_nexa_activity() from public;
revoke all on function public.delete_nexa_account() from public;
revoke all on function public.claim_nexa_accounts_for_cleanup(text) from public;
revoke all on function public.confirm_nexa_account_cleanup(uuid, text) from public;

grant execute on function public.touch_nexa_activity() to authenticated;
grant execute on function public.delete_nexa_account() to authenticated;
grant execute on function public.claim_nexa_accounts_for_cleanup(text) to service_role;
grant execute on function public.confirm_nexa_account_cleanup(uuid, text) to service_role;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'nexa-inactive-account-cleanup';

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end;
$$;

select cron.schedule(
  'nexa-inactive-account-cleanup',
  '17 3 * * *',
  $cron$
    select net.http_post(
      url := 'https://vsnvzgcotnrxrbztrxlp.supabase.co/functions/v1/cleanup-inactive-accounts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-nexa-cleanup-secret', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'nexa_inactive_cleanup_secret'
        )
      ),
      body := jsonb_build_object('requested_at', now()),
      timeout_milliseconds := 60000
    );
  $cron$
);

comment on column public.profiles.last_active_at is
  'Last authenticated dashboard activity. Updated at most once per hour.';
comment on column public.profiles.deletion_scheduled_at is
  'Automatic deletion eligibility after 180 inactive days plus a 30-day grace period.';
