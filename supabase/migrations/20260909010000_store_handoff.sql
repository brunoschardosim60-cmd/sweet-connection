-- Convites não são autorização por URL: o aceite exige a conta e o e-mail confirmados.
create table public.minisite_entregas (
 id uuid primary key default gen_random_uuid(),
 minisite_id uuid not null references public.minisites(id) on delete cascade,
 remetente_id uuid references auth.users(id) on delete set null,
 destinatario_email text not null,
 destinatario_id uuid references auth.users(id) on delete set null,
 manter_acesso boolean not null default false,
 guardar_copia boolean not null default true,
 copia_id uuid references public.minisites(id) on delete set null,
 status text not null default 'pendente' check(status in ('pendente','aceita','revogada','recusada')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days',
 accepted_at timestamptz
);
create unique index minisite_entrega_pendente on public.minisite_entregas(minisite_id) where status='pendente';
alter table public.minisite_entregas enable row level security;
revoke all on public.minisite_entregas from public,anon,authenticated;
grant all on public.minisite_entregas to service_role;

-- As versões acompanham a loja, e não ficam acessíveis ao proprietário anterior.
alter table public.minisite_versions drop constraint versions_minisite_owner_fk;
alter table public.minisite_versions add constraint versions_minisite_owner_fk foreign key(minisite_id,owner_id)
 references public.minisites(id,owner_id) on update cascade on delete cascade;

create or replace function public.nexa_plano_conteudo(c jsonb)
returns integer language sql immutable set search_path=pg_catalog,public as $$
 select case when coalesce(jsonb_array_length(c->'produtos'),0)>0
   or coalesce((c->'comercio'->>'carrinho')::boolean,false)
   or coalesce((c->>'mostrarAssinaturaNexa')::boolean,true)=false
   or exists(select 1 from jsonb_array_elements(coalesce(c->'secoes','[]')) s where coalesce((s->>'ativa')::boolean,false) and s->>'tipo' in ('produtos','cardapio','cupom','promocao')) then 3
 when coalesce((c->'agenda'->>'ativa')::boolean,false)
   or exists(select 1 from jsonb_array_elements(coalesce(c->'secoes','[]')) s where coalesce((s->>'ativa')::boolean,false) and s->>'tipo' in ('servicos','galeria','videos','depoimentos','equipe','agenda')) then 2 else 1 end
$$;
revoke all on function public.nexa_plano_conteudo(jsonb) from public,anon,authenticated;

create or replace function public.nexa_entrega_requisito(loja public.minisites, usuario uuid)
returns text language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare p public.profiles%rowtype; nivel integer; limite integer;
begin
 select * into p from public.profiles where id=usuario;
 if p.id is null or p.admin_suspended_at is not null then return 'account_unavailable'; end if;
 if public.has_role(usuario,'admin') then return null; end if;
 nivel:=greatest(public.nexa_plano_conteudo(loja.draft_content),public.nexa_plano_conteudo(loja.published_content));
 if not public.nexa_plan_allows_publish(usuario) then return 'subscription_required'; end if;
 if (case p.subscription_tier when 'catalog' then 3 when 'professional' then 2 when 'essential' then 1 else 0 end)<nivel then return 'plan_upgrade_required'; end if;
 limite:=case p.subscription_tier when 'catalog' then 50 when 'professional' then 3 else 1 end;
 if (select count(*) from public.minisites where owner_id=usuario and id<>loja.id)>=limite then return 'minisite_creation_limit_reached'; end if;
 return null;
end $$;
revoke all on function public.nexa_entrega_requisito(public.minisites,uuid) from public,anon,authenticated;

create or replace function public.nexa_entrega_criar(site_id uuid,email text,manter_acesso boolean default false,guardar_copia boolean default true)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare loja public.minisites%rowtype; convite uuid; destino text:=lower(trim(email));
begin
 select * into loja from public.minisites where id=site_id and owner_id=auth.uid() for update;
 if not found then raise exception 'not_allowed'; end if;
 if length(destino)>254 or destino!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalid_email'; end if;
 if exists(select 1 from auth.users where id=auth.uid() and lower(auth.users.email)=destino) then raise exception 'already_owner'; end if;
 if (select count(*) from public.minisite_entregas where remetente_id=auth.uid() and created_at>now()-interval '1 day')>=50 then raise exception 'invitation_limit'; end if;
 update public.minisite_entregas set status='revogada' where minisite_id=site_id and status='pendente';
 insert into public.minisite_entregas(minisite_id,remetente_id,destinatario_email,manter_acesso,guardar_copia)
 values(site_id,auth.uid(),destino,manter_acesso,guardar_copia) returning id into convite;
 insert into public.operacao_auditoria(minisite_id,user_id,acao,alvo) values(site_id,auth.uid(),'entrega:convidar',convite);
 return convite;
end $$;
revoke all on function public.nexa_entrega_criar(uuid,text,boolean,boolean) from public,anon,authenticated;
grant execute on function public.nexa_entrega_criar(uuid,text,boolean,boolean) to authenticated;

create or replace function public.nexa_entregas_listar()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'siteId',m.id,'nome',coalesce(m.draft_content->'conteudo'->>'nome',m.slug),'slug',m.slug,
 'email',e.destinatario_email,'status',case when e.status='pendente' and e.expires_at<now() then 'expirada' else e.status end,
 'expiraEm',e.expires_at,'enviado',e.remetente_id=auth.uid(),'manterAcesso',e.manter_acesso,'guardarCopia',e.guardar_copia,'copiaId',e.copia_id) order by e.created_at desc),'[]')
 from public.minisite_entregas e join public.minisites m on m.id=e.minisite_id
 where auth.uid() is not null and (e.remetente_id=auth.uid() or e.destinatario_id=auth.uid() or (e.status<>'aceita' and exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and lower(u.email)=e.destinatario_email)))
$$;
revoke all on function public.nexa_entregas_listar() from public,anon,authenticated;
grant execute on function public.nexa_entregas_listar() to authenticated;

create or replace function public.nexa_entrega_consultar(convite uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare e public.minisite_entregas%rowtype; m public.minisites%rowtype; destinatario boolean; requisito text;
begin
 select * into e from public.minisite_entregas where id=convite;
 destinatario:=case when e.status='aceita' then coalesce(e.destinatario_id=auth.uid(),false) else exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and lower(u.email)=e.destinatario_email) end;
 if e.id is null or auth.uid() is null or not (coalesce(e.remetente_id=auth.uid(),false) or destinatario) then raise exception 'not_allowed'; end if;
 select * into m from public.minisites where id=e.minisite_id;
 requisito:=case when destinatario then public.nexa_entrega_requisito(m,auth.uid()) else null end;
 return jsonb_build_object('id',e.id,'siteId',m.id,'nome',coalesce(m.draft_content->'conteudo'->>'nome',m.slug),'slug',m.slug,'email',e.destinatario_email,
 'status',case when e.status='pendente' and e.expires_at<now() then 'expirada' else e.status end,'expiraEm',e.expires_at,
 'enviado',e.remetente_id=auth.uid(),'destinatario',destinatario,'manterAcesso',e.manter_acesso,'guardarCopia',e.guardar_copia,
 'publicado',m.status='publicado','planoNecessario',case greatest(public.nexa_plano_conteudo(m.draft_content),public.nexa_plano_conteudo(m.published_content)) when 3 then 'Catálogo' when 2 then 'Profissional' else 'Essencial' end,
 'impedimento',requisito,'copiaId',e.copia_id);
end $$;
revoke all on function public.nexa_entrega_consultar(uuid) from public,anon,authenticated;
grant execute on function public.nexa_entrega_consultar(uuid) to authenticated;

create or replace function public.nexa_entrega_cancelar(convite uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare e public.minisite_entregas%rowtype;
begin
 select * into e from public.minisite_entregas where id=convite for update;
 if auth.uid() is null or e.id is null then raise exception 'not_allowed'; end if;
 if e.status<>'pendente' then raise exception 'invitation_unavailable'; end if;
 if e.remetente_id=auth.uid() and exists(select 1 from public.minisites where id=e.minisite_id and owner_id=auth.uid()) then
   update public.minisite_entregas set status='revogada' where id=convite;
 elsif exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null and lower(email)=e.destinatario_email) then
   update public.minisite_entregas set status='recusada' where id=convite;
 else raise exception 'not_allowed'; end if;
 insert into public.operacao_auditoria(minisite_id,user_id,acao,alvo) values(e.minisite_id,auth.uid(),'entrega:cancelar',convite);
end $$;
revoke all on function public.nexa_entrega_cancelar(uuid) from public,anon,authenticated;
grant execute on function public.nexa_entrega_cancelar(uuid) to authenticated;

-- Cópia reutilizável: somente apresentação e conteúdo de catálogo; sem leads, equipe,
-- depoimentos de pessoas, dados de recebimento, integrações, contatos ou histórico.
create or replace function public.nexa_modelo_limpo(c jsonb)
returns jsonb language sql immutable set search_path=pg_catalog,public as $$
 select jsonb_build_object(
 'modeloId',c->'modeloId','aparencia',c->'aparencia','secoes',coalesce((select jsonb_agg(jsonb_build_object('id',s->'id','tipo',s->'tipo','titulo',s->'titulo','ativa',case when s->>'tipo' in ('equipe','depoimentos','agenda','cupom','promocao','livre') then 'false'::jsonb else s->'ativa' end)) from jsonb_array_elements(coalesce(c->'secoes','[]')) s),'[]'),'mostrarAssinaturaNexa',true,
 'cliente',jsonb_build_object('empresa','Cópia modelo','segmento',coalesce(c->'cliente'->>'segmento','servicos'),'responsavel','','telefone','','email','','cidade','','estado',''),
 'conteudo',jsonb_build_object('nome','Cópia modelo','descricao','','capa',c->'conteudo'->'capa','telefone','','whatsapp','','email','','instagram','','endereco','','horarios','[]'::jsonb),
 'produtos',coalesce((select jsonb_agg((select jsonb_object_agg(k,v) from jsonb_each(p) as t(k,v) where k in ('id','nome','descricao','preco','precoPromocional','imagem','categoria','variacoes','disponivel','destaque','personalizacoes'))) from jsonb_array_elements(coalesce(c->'produtos','[]')) p),'[]'),
 'servicos',coalesce((select jsonb_agg((select jsonb_object_agg(k,v) from jsonb_each(p) as t(k,v) where k in ('id','nome','descricao','preco','imagem','duracao','ativo'))) from jsonb_array_elements(coalesce(c->'servicos','[]')) p),'[]'),
 'links','[]'::jsonb,'galeria','[]'::jsonb,'videos','[]'::jsonb,'depoimentos','[]'::jsonb,'equipe','[]'::jsonb,'cupons','[]'::jsonb,'faq','[]'::jsonb,
 'formulario',jsonb_build_object('tipo','contato','titulo','Entre em contato','campos','[]'::jsonb),
 'seo',jsonb_build_object('titulo','Cópia modelo','descricao','','palavras',''),
 'integracoes',jsonb_build_object('googleAnalytics','','metaPixel','','dominio','','googleMaps','','whatsappApi',''),
 'metricas',jsonb_build_object('visitas',0,'cliquesWhatsapp',0,'solicitacoes',0,'serie','[]'::jsonb,'origens','[]'::jsonb,'horarios','[]'::jsonb),
 'comercio',jsonb_build_object('carrinho',coalesce((c->'comercio'->>'carrinho')::boolean,false),'taxaEntrega',0,'taxaEntregaDefinida',false,'pedidoMinimo',0,'modalidadesPedido',jsonb_build_array('entrega','retirada')))
$$;
revoke all on function public.nexa_modelo_limpo(jsonb) from public,anon,authenticated;

create or replace function public.nexa_entrega_pacote(site_id uuid)
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
 select jsonb_build_object('rascunho',m.draft_content,'publicado',m.published_content,'versoes',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'conteudo',v.content) order by v.id) from public.minisite_versions v where v.minisite_id=m.id),'[]')) from public.minisites m where m.id=site_id
$$;
revoke all on function public.nexa_entrega_pacote(uuid) from public,anon,authenticated;

create or replace function public.nexa_entrega_preparar(convite uuid,usuario uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare e public.minisite_entregas%rowtype; m public.minisites%rowtype; pacote jsonb; requisito text;
begin
 select * into e from public.minisite_entregas where id=convite;
 if e.id is null or not exists(select 1 from auth.users where id=usuario and email_confirmed_at is not null and (case when e.status='aceita' then e.destinatario_id=usuario else lower(email)=e.destinatario_email end)) then raise exception 'not_allowed'; end if;
 if e.status='aceita' and e.destinatario_id=usuario then return jsonb_build_object('aceita',true,'siteId',e.minisite_id); end if;
 if e.status<>'pendente' or e.expires_at<=now() then raise exception 'invitation_unavailable'; end if;
 select * into m from public.minisites where id=e.minisite_id;
 if m.owner_id is distinct from e.remetente_id then raise exception 'invitation_unavailable'; end if;
 requisito:=public.nexa_entrega_requisito(m,usuario);
 if requisito is not null then raise exception '%',requisito; end if;
 pacote:=public.nexa_entrega_pacote(m.id);
 return jsonb_build_object('siteId',m.id,'remetenteId',e.remetente_id,'pacote',pacote,'revisao',md5(pacote::text));
end $$;
revoke all on function public.nexa_entrega_preparar(uuid,uuid) from public,anon,authenticated;
grant execute on function public.nexa_entrega_preparar(uuid,uuid) to service_role;

create or replace function public.nexa_substituir_midias(valor jsonb,mapa jsonb)
returns jsonb language plpgsql immutable set search_path=pg_catalog,public as $$
declare resultado jsonb; k text; v jsonb;
begin
 if jsonb_typeof(valor)='string' then return coalesce(mapa->(valor#>>'{}'),valor); end if;
 if jsonb_typeof(valor)='array' then
  select coalesce(jsonb_agg(public.nexa_substituir_midias(x,mapa)),'[]') into resultado from jsonb_array_elements(valor) x; return resultado;
 end if;
 if jsonb_typeof(valor)='object' then
  resultado:='{}'; for k,v in select * from jsonb_each(valor) loop resultado:=resultado||jsonb_build_object(k,public.nexa_substituir_midias(v,mapa)); end loop; return resultado;
 end if;
 return valor;
end $$;
revoke all on function public.nexa_substituir_midias(jsonb,jsonb) from public,anon,authenticated;

create or replace function public.nexa_entrega_finalizar(convite uuid,usuario uuid,revisao text,mapa jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare e public.minisite_entregas%rowtype; m public.minisites%rowtype; pacote jsonb; requisito text; cliente uuid; copia uuid; cc uuid; cs text; limpo jsonb;
begin
 -- Ordem fixa de locks evita duplo aceite e mantém limites em entregas concorrentes.
 select * into e from public.minisite_entregas where id=convite for update;
 if e.id is null or not exists(select 1 from auth.users where id=usuario and email_confirmed_at is not null and (case when e.status='aceita' then e.destinatario_id=usuario else lower(email)=e.destinatario_email end)) then raise exception 'not_allowed'; end if;
 if e.status='aceita' and e.destinatario_id=usuario then return jsonb_build_object('siteId',e.minisite_id,'aceita',true); end if;
 perform 1 from public.profiles where id in (e.remetente_id,usuario) order by id for update;
 select * into m from public.minisites where id=e.minisite_id for update;
 if e.status<>'pendente' or e.expires_at<=now() or m.owner_id is distinct from e.remetente_id then raise exception 'invitation_unavailable'; end if;
 requisito:=public.nexa_entrega_requisito(m,usuario); if requisito is not null then raise exception '%',requisito; end if;
 perform 1 from public.minisite_versions where minisite_id=m.id for update;
 pacote:=public.nexa_entrega_pacote(m.id); if md5(pacote::text)<>revisao then raise exception 'site_changed'; end if;
 insert into public.clients(owner_id,company,segment,contact_name,phone,email,city,state)
 select usuario,company,segment,contact_name,phone,email,city,state from public.clients where id=m.client_id returning id into cliente;
 if cliente is null then raise exception 'client_not_found'; end if;
 update public.minisites set owner_id=usuario,client_id=cliente,
 draft_content=public.nexa_substituir_midias(draft_content,mapa)||jsonb_build_object('integracoes',jsonb_build_object('googleAnalytics','','metaPixel','','dominio','','googleMaps','','whatsappApi','')),
 published_content=case when published_content is null then null else public.nexa_substituir_midias(published_content,mapa)||jsonb_build_object('integracoes',jsonb_build_object('googleAnalytics','','metaPixel','','dominio','','googleMaps','','whatsappApi','')) end
 where id=m.id;
 delete from public.clients c where c.id=m.client_id and not exists(select 1 from public.minisites s where s.client_id=c.id);
 update public.minisite_versions set content=public.nexa_substituir_midias(content,mapa)||jsonb_build_object('integracoes',jsonb_build_object('googleAnalytics','','metaPixel','','dominio','','googleMaps','','whatsappApi','')) where minisite_id=m.id;
 -- O cliente recebe uma lista de acessos limpa; o criador só permanece se isso foi aceito.
 delete from public.minisite_operadores where minisite_id=m.id;
 if e.manter_acesso then insert into public.minisite_operadores(minisite_id,user_id,created_by) values(m.id,e.remetente_id,usuario); end if;
 if e.guardar_copia then
   copia:=gen_random_uuid();cs:='modelo-'||replace(copia::text,'-','');limpo:=public.nexa_modelo_limpo(m.draft_content);
   insert into public.clients(owner_id,company,segment) values(e.remetente_id,'Cópia modelo',coalesce(limpo->'cliente'->>'segmento','servicos')) returning id into cc;
   insert into public.minisites(id,owner_id,client_id,slug,status,draft_content) values(copia,e.remetente_id,cc,cs,'rascunho',limpo||jsonb_build_object('id',copia,'slug',cs,'status','rascunho','criadoEm',now(),'atualizadoEm',now(),'expiraEm',null));
 end if;
 update public.minisite_entregas set status='aceita',destinatario_id=usuario,accepted_at=now(),copia_id=copia where id=convite;
 insert into public.operacao_auditoria(minisite_id,user_id,acao,alvo) values(m.id,usuario,'entrega:aceitar',convite);
 return jsonb_build_object('siteId',m.id,'aceita',true);
end $$;
revoke all on function public.nexa_entrega_finalizar(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.nexa_entrega_finalizar(uuid,uuid,text,jsonb) to service_role;

create or replace function public.nexa_operacao_sair(site_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if auth.uid() is null or exists(select 1 from public.minisites where id=site_id and owner_id=auth.uid()) then raise exception 'owner_cannot_leave'; end if;
 delete from public.minisite_operadores where minisite_id=site_id and user_id=auth.uid();
 if not found then raise exception 'not_allowed'; end if;
 insert into public.operacao_auditoria(minisite_id,user_id,acao) values(site_id,auth.uid(),'operacao:sair');
end $$;
revoke all on function public.nexa_operacao_sair(uuid) from public,anon,authenticated;
grant execute on function public.nexa_operacao_sair(uuid) to authenticated;

-- Mesmo um save/restore fora da UI não pode reativar conteúdo acima do plano.
create or replace function public.nexa_validar_plano_snapshot()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare tier text; nivel integer;
begin
 if new.status<>'publicado' or public.has_role(new.owner_id,'admin') then return new; end if;
 if tg_op='UPDATE' and new.owner_id=old.owner_id and new.status=old.status and new.published_content is not distinct from old.published_content then return new; end if;
 if not public.nexa_plan_allows_publish(new.owner_id) then raise exception 'subscription_required'; end if;
 select subscription_tier into tier from public.profiles where id=new.owner_id;
 nivel:=public.nexa_plano_conteudo(new.published_content);
 if (case tier when 'catalog' then 3 when 'professional' then 2 when 'essential' then 1 else 0 end)<nivel then raise exception 'plan_upgrade_required'; end if;
 return new;
end $$;
revoke all on function public.nexa_validar_plano_snapshot() from public,anon,authenticated;
create trigger nexa_validar_plano_snapshot before insert or update on public.minisites for each row execute function public.nexa_validar_plano_snapshot();

-- Mudanças de assinatura não herdam benefícios do criador. Preserva conteúdo e histórico.
-- Executa antes dos restauradores de assinatura visual existentes para não impedir o billing.
create or replace function public.nexa_pausar_recursos_apos_plano()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare nivel integer;
begin
 if public.has_role(new.id,'admin') then return new; end if;
 nivel:=case when new.subscription_status='active' and (not new.billing_cancel_at_period_end or new.billing_current_period_end>now())
 then case new.subscription_tier when 'catalog' then 3 when 'professional' then 2 when 'essential' then 1 else 0 end else 0 end;
 update public.minisites set status='pausado',draft_content=draft_content||jsonb_build_object('status','pausado')
 where owner_id=new.id and status='publicado' and public.nexa_plano_conteudo(published_content)>nivel;
 return new;
end $$;
revoke all on function public.nexa_pausar_recursos_apos_plano() from public,anon,authenticated;
create trigger nexa_pausar_recursos_apos_plano before update of subscription_tier,subscription_status,billing_cancel_at_period_end,billing_current_period_end
 on public.profiles for each row execute function public.nexa_pausar_recursos_apos_plano();
