-- The existing admin screen still assigns the legacy free/pro field. Keep it
-- synchronized with commercial access until the payment screen replaces it.
create or replace function public.sync_nexa_subscription_from_plan()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if new.plan is distinct from old.plan then
    new.subscription_tier := case when new.plan::text = 'pro' then 'professional' else 'none' end;
    new.subscription_status := case when new.plan::text = 'pro' then 'active' else 'inactive' end;
  end if;
  return new;
end; $$;

drop trigger if exists sync_nexa_subscription_from_plan on public.profiles;
create trigger sync_nexa_subscription_from_plan
  before update of plan on public.profiles
  for each row execute function public.sync_nexa_subscription_from_plan();
