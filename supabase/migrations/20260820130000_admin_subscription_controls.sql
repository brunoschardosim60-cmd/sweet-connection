create or replace function public.sync_nexa_subscription_from_plan()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if new.plan is distinct from old.plan
     and new.subscription_tier is not distinct from old.subscription_tier then
    new.subscription_tier := case when new.plan::text = 'pro' then 'professional' else 'none' end;
    new.subscription_status := case when new.plan::text = 'pro' then 'active' else 'inactive' end;
  end if;
  return new;
end; $$;

create or replace function public.nexa_admin_set_subscription(requested_user_id uuid, requested_tier text, requested_status text)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare previous text;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'admin_required' using errcode = '42501'; end if;
  if requested_tier not in ('none','essential','professional','catalog') or requested_status not in ('inactive','active','past_due','cancelled') then raise exception 'invalid_subscription' using errcode = '22023'; end if;
  select subscription_tier || ':' || subscription_status into previous from public.profiles where id=requested_user_id;
  if previous is null then raise exception 'profile_not_found' using errcode='P0002'; end if;
  update public.profiles set subscription_tier=requested_tier, subscription_status=requested_status,
    plan=case when requested_tier in ('professional','catalog') and requested_status='active' then 'pro'::public.nexa_plan else 'free'::public.nexa_plan end
  where id=requested_user_id;
  insert into public.admin_audit_log(actor_user_id,target_user_id,action,previous_value,new_value)
  values(auth.uid(),requested_user_id,'plan_changed',previous,requested_tier || ':' || requested_status);
end; $$;
revoke all on function public.nexa_admin_set_subscription(uuid,text,text) from public, anon;
grant execute on function public.nexa_admin_set_subscription(uuid,text,text) to authenticated;
