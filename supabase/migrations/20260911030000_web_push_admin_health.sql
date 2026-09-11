-- Separate unconfigured channels from actual failures, and include Web Push health.
create or replace function public.nexa_admin_health()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
 if not public.has_role(auth.uid(),'admin') then raise exception 'admin_required' using errcode='42501'; end if;
 return jsonb_build_object(
  'notification_failures_7d',(select count(*) from public.notification_deliveries where status='failed' and created_at>=now()-interval '7 days'),
  'notifications_skipped_7d',(select count(*) from public.notification_deliveries where status='skipped' and created_at>=now()-interval '7 days'),
  'notifications_pending_24h',(select count(*) from public.notification_deliveries where status in ('pending','processing') and created_at<now()-interval '24 hours'),
  'push_pending',(select count(*) from public.nexa_push_jobs where status in ('pending','processing')),
  'push_failed_7d',(select count(*) from public.nexa_push_jobs where status='failed' and created_at>=now()-interval '7 days'),
  'push_sent_24h',(select count(*) from public.nexa_push_jobs where status='sent' and created_at>=now()-interval '24 hours'),
  'overdue_invoices',(select count(*) from public.billing_invoices where status='OVERDUE'),
  'accounts_suspended',(select count(*) from public.profiles where admin_suspended_at is not null),
  'forms_24h',(select count(*) from public.form_submissions where created_at>=now()-interval '24 hours'),
  'orders_24h',(select count(*) from public.pedidos_cardapio where created_at>=now()-interval '24 hours')
 );
end $$;
revoke all on function public.nexa_admin_health() from public,anon;
grant execute on function public.nexa_admin_health() to authenticated;
