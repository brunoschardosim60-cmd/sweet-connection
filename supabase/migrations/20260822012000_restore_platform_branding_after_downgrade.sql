-- A preferência de white label também é salva em platform_settings. Sem esta
-- correção, uma conta que saiu do Catálogo podia tentar criar um novo rascunho
-- sem a assinatura Nexa e receber um bloqueio indevido.
create or replace function public.nexa_restore_branding_after_downgrade()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.has_role(new.id, 'admin')
     and (new.subscription_tier <> 'catalog' or new.subscription_status <> 'active') then
    update public.platform_settings
    set settings = jsonb_set(
      coalesce(settings, '{}'::jsonb), '{mostrarAssinatura}', 'true'::jsonb, true
    )
    where owner_id = new.id
      and coalesce((settings ->> 'mostrarAssinatura')::boolean, true) = false;

    update public.minisites
    set draft_content = coalesce(draft_content, '{}'::jsonb) || jsonb_build_object('mostrarAssinaturaNexa', true),
        published_content = case when published_content is null then null else published_content || jsonb_build_object('mostrarAssinaturaNexa', true) end
    where owner_id = new.id
      and (coalesce((draft_content ->> 'mostrarAssinaturaNexa')::boolean, true) = false
        or coalesce((published_content ->> 'mostrarAssinaturaNexa')::boolean, true) = false);
  end if;
  return new;
end;
$$;

-- Corrige preferências de contas já rebaixadas antes desta migration.
update public.platform_settings ps
set settings = jsonb_set(
  coalesce(ps.settings, '{}'::jsonb), '{mostrarAssinatura}', 'true'::jsonb, true
)
from public.profiles p
where p.id = ps.owner_id
  and not public.has_role(p.id, 'admin')
  and (p.subscription_tier <> 'catalog' or p.subscription_status <> 'active')
  and coalesce((ps.settings ->> 'mostrarAssinatura')::boolean, true) = false;
