-- White label é válido somente enquanto o Catálogo estiver ativo. Ao perder o
-- plano, rascunhos e versões públicas voltam a exibir a assinatura Nexa.
create or replace function public.nexa_restore_branding_after_downgrade()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.has_role(new.id, 'admin')
     and (new.subscription_tier <> 'catalog' or new.subscription_status <> 'active') then
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

drop trigger if exists profiles_restore_nexa_branding on public.profiles;
create trigger profiles_restore_nexa_branding
after update of subscription_tier, subscription_status on public.profiles
for each row execute function public.nexa_restore_branding_after_downgrade();

-- Corrige também eventuais projetos antigos de contas que já não possuem
-- Catálogo ativo antes da criação do trigger.
update public.minisites m
set draft_content = coalesce(m.draft_content, '{}'::jsonb) || jsonb_build_object('mostrarAssinaturaNexa', true),
    published_content = case when m.published_content is null then null else m.published_content || jsonb_build_object('mostrarAssinaturaNexa', true) end
from public.profiles p
where p.id = m.owner_id
  and not public.has_role(p.id, 'admin')
  and (p.subscription_tier <> 'catalog' or p.subscription_status <> 'active')
  and (coalesce((m.draft_content ->> 'mostrarAssinaturaNexa')::boolean, true) = false
    or coalesce((m.published_content ->> 'mostrarAssinaturaNexa')::boolean, true) = false);
