-- Um cancelamento só mantém o acesso durante o período já pago quando o fim
-- desse período foi registrado. Sem data, falhamos fechados para impedir que
-- um mini-site permaneça público indefinidamente por uma resposta incompleta
-- do provedor de cobrança.
create or replace function public.nexa_plan_allows_publish(requested_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.has_role(requested_user_id, 'admin') or exists (
    select 1
    from public.profiles p
    where p.id = requested_user_id
      and p.subscription_status = 'active'
      and p.subscription_tier <> 'none'
      and (
        not p.billing_cancel_at_period_end
        or (p.billing_current_period_end is not null and p.billing_current_period_end > now())
      )
  );
$$;

create or replace function public.nexa_plan_allows_public_site(requested_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.has_role(requested_user_id, 'admin') or exists (
    select 1
    from public.profiles p
    where p.id = requested_user_id
      and p.subscription_status = 'active'
      and p.subscription_tier <> 'none'
      and (
        not p.billing_cancel_at_period_end
        or (p.billing_current_period_end is not null and p.billing_current_period_end > now())
      )
  );
$$;
