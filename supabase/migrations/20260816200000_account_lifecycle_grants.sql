-- Supabase may add API-role execute grants when public functions are created.
-- Keep lifecycle maintenance private to the intended callers.

revoke execute on function public.claim_nexa_accounts_for_cleanup(text)
  from anon, authenticated;
revoke execute on function public.confirm_nexa_account_cleanup(uuid, text)
  from anon, authenticated;
revoke execute on function public.delete_nexa_account()
  from anon;
revoke execute on function public.touch_nexa_activity()
  from anon;

grant execute on function public.claim_nexa_accounts_for_cleanup(text)
  to service_role;
grant execute on function public.confirm_nexa_account_cleanup(uuid, text)
  to service_role;
grant execute on function public.delete_nexa_account()
  to authenticated;
grant execute on function public.touch_nexa_activity()
  to authenticated;
