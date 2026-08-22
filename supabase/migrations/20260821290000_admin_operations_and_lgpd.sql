-- Operational controls for the Nexa super-admin. All mutations go through
-- SECURITY DEFINER functions and are recorded in the immutable audit log.

alter table public.profiles
  add column if not exists admin_suspended_at timestamptz,
  add column if not exists admin_suspension_reason text;

alter table public.admin_audit_log drop constraint if exists admin_audit_log_action_check;
alter table public.admin_audit_log add constraint admin_audit_log_action_check check (
  action in ('plan_changed', 'account_suspended', 'account_reactivated', 'announcement_created')
);

create table if not exists public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  message text not null check (char_length(message) between 3 and 2000),
  target_tier text check (target_tier is null or target_tier in ('none','essential','professional','catalog')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
alter table public.platform_announcements enable row level security;
revoke all on public.platform_announcements from anon;
grant select on public.platform_announcements to authenticated;
grant all on public.platform_announcements to service_role;
drop policy if exists announcements_visible_to_target on public.platform_announcements;
create policy announcements_visible_to_target on public.platform_announcements
  for select to authenticated using (
    public.has_role(auth.uid(), 'admin')
    or (
      starts_at <= now() and (ends_at is null or ends_at > now())
      and (target_tier is null or target_tier = (select subscription_tier from public.profiles where id = auth.uid()))
    )
  );

create or replace function public.nexa_admin_set_account_suspension(
  requested_user_id uuid,
  requested_suspended boolean,
  requested_reason text default null
) returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare previous text;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if requested_user_id = auth.uid() and requested_suspended then
    raise exception 'cannot_suspend_self' using errcode = '22023';
  end if;
  select case when admin_suspended_at is null then 'active' else 'suspended' end
    into previous from public.profiles where id = requested_user_id for update;
  if previous is null then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  update public.profiles set
    admin_suspended_at = case when requested_suspended then now() else null end,
    admin_suspension_reason = case when requested_suspended then nullif(left(trim(coalesce(requested_reason, '')), 500), '') else null end
  where id = requested_user_id;
  insert into public.admin_audit_log(actor_user_id, target_user_id, action, previous_value, new_value)
  values (
    auth.uid(), requested_user_id,
    case when requested_suspended then 'account_suspended' else 'account_reactivated' end,
    previous,
    case when requested_suspended then coalesce(nullif(left(trim(coalesce(requested_reason, '')), 500), ''), 'Sem motivo informado') else 'active' end
  );
end;
$$;

create or replace function public.nexa_admin_create_announcement(
  requested_title text,
  requested_message text,
  requested_target_tier text default null,
  requested_ends_at timestamptz default null
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare announcement_id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'admin_required' using errcode = '42501'; end if;
  if requested_target_tier is not null and requested_target_tier not in ('none','essential','professional','catalog') then
    raise exception 'invalid_tier' using errcode = '22023';
  end if;
  insert into public.platform_announcements(title, message, target_tier, ends_at, created_by)
  values (trim(requested_title), trim(requested_message), requested_target_tier, requested_ends_at, auth.uid())
  returning id into announcement_id;
  insert into public.admin_audit_log(actor_user_id, action, previous_value, new_value)
  values(auth.uid(), 'announcement_created', null, announcement_id::text);
  return announcement_id;
end;
$$;

create or replace function public.nexa_admin_health()
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'admin_required' using errcode = '42501'; end if;
  return jsonb_build_object(
    'notification_failures_7d', (select count(*) from public.notification_deliveries where last_error is not null and created_at >= now() - interval '7 days'),
    'notifications_pending_24h', (select count(*) from public.notification_deliveries where status in ('pending','processing') and created_at < now() - interval '24 hours'),
    'overdue_invoices', (select count(*) from public.billing_invoices where status = 'OVERDUE'),
    'accounts_suspended', (select count(*) from public.profiles where admin_suspended_at is not null),
    'forms_24h', (select count(*) from public.form_submissions where created_at >= now() - interval '24 hours'),
    'orders_24h', (select count(*) from public.pedidos_cardapio where created_at >= now() - interval '24 hours')
  );
end;
$$;

create or replace function public.nexa_admin_export_account(requested_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'admin_required' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = requested_user_id) then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  return jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) - 'plan_changed_by' from public.profiles p where p.id = requested_user_id),
    'minisites', coalesce((select jsonb_agg(to_jsonb(m)) from public.minisites m where m.owner_id = requested_user_id), '[]'::jsonb),
    'submissions', coalesce((select jsonb_agg(to_jsonb(f)) from public.form_submissions f join public.minisites m on m.id = f.minisite_id where m.owner_id = requested_user_id), '[]'::jsonb),
    'invoices', coalesce((select jsonb_agg(to_jsonb(i)) from public.billing_invoices i where i.owner_id = requested_user_id), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.nexa_admin_set_account_suspension(uuid, boolean, text) from public, anon;
grant execute on function public.nexa_admin_set_account_suspension(uuid, boolean, text) to authenticated;
revoke all on function public.nexa_admin_create_announcement(text, text, text, timestamptz) from public, anon;
grant execute on function public.nexa_admin_create_announcement(text, text, text, timestamptz) to authenticated;
revoke all on function public.nexa_admin_health() from public, anon;
grant execute on function public.nexa_admin_health() to authenticated;
revoke all on function public.nexa_admin_export_account(uuid) from public, anon;
grant execute on function public.nexa_admin_export_account(uuid) to authenticated;
