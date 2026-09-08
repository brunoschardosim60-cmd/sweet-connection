-- Acesso operacional é por estabelecimento; nunca concede acesso ao rascunho/editor.
create table public.minisite_operadores (
 minisite_id uuid not null references public.minisites(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 primary key(minisite_id,user_id)
);
alter table public.minisite_operadores enable row level security;
revoke all on public.minisite_operadores from public,anon,authenticated;
grant all on public.minisite_operadores to service_role;
create index minisite_operadores_user on public.minisite_operadores(user_id);

create table public.operacao_auditoria (
 id bigint generated always as identity primary key, minisite_id uuid references public.minisites(id) on delete cascade,
 user_id uuid references auth.users(id) on delete set null, acao text not null, alvo uuid,
 created_at timestamptz not null default now()
);
alter table public.operacao_auditoria enable row level security;
revoke all on public.operacao_auditoria from public,anon,authenticated;
grant all on public.operacao_auditoria to service_role;

create or replace function public.nexa_pode_operar_site(site_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and exists(select 1 from public.minisites m where m.id=site_id and
   (m.owner_id=auth.uid() or exists(select 1 from public.minisite_operadores o where o.minisite_id=m.id and o.user_id=auth.uid())))
$$;
revoke all on function public.nexa_pode_operar_site(uuid) from public,anon,authenticated;

create or replace function public.nexa_operacao_sites()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'slug',m.slug,'nome',coalesce(m.published_content->'conteudo'->>'nome',m.draft_content->'conteudo'->>'nome',m.slug),'dono',m.owner_id=auth.uid(),'publicado',m.status='publicado') order by m.created_at desc),'[]'::jsonb)
 from public.minisites m where public.nexa_pode_operar_site(m.id)
$$;
revoke all on function public.nexa_operacao_sites() from public,anon,authenticated;
grant execute on function public.nexa_operacao_sites() to authenticated;

create or replace function public.nexa_operacao_dados(site_id uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare resultado jsonb;
begin
 if not public.nexa_pode_operar_site(site_id) then raise exception 'not_allowed'; end if;
 select jsonb_build_object(
  'pedidos',coalesce((select jsonb_agg(to_jsonb(p)) from (select id,codigo,status,modalidade,nome,telefone,itens,subtotal,taxa_entrega,total,pagamento,troco,endereco,bairro,complemento,referencia,observacao,horario_preferido,agendado_para,created_at from public.pedidos_cardapio where minisite_id=site_id order by created_at desc limit 500) p),'[]'::jsonb),
  'agenda',coalesce((select jsonb_agg(to_jsonb(a)) from (select id,data,hora,servico,nome,telefone,observacao,status from public.agendamentos where minisite_id=site_id order by data desc,hora desc limit 500) a),'[]'::jsonb),
  'solicitacoes',coalesce((select jsonb_agg(to_jsonb(f)) from (select id,payload,status,created_at from public.form_submissions where minisite_id=site_id order by created_at desc limit 500) f),'[]'::jsonb),
  'estatisticas',jsonb_build_object(
   'visitas',(select count(*) from public.analytics_events where minisite_id=site_id and event_type='visita' and occurred_at>=now()-interval '30 days'),
   'cliques',(select count(*) from public.analytics_events where minisite_id=site_id and event_type='clique' and occurred_at>=now()-interval '30 days'),
   'whatsapp',(select count(*) from public.analytics_events where minisite_id=site_id and event_type='whatsapp' and occurred_at>=now()-interval '30 days'),
   'pedidos',(select count(*) from public.pedidos_cardapio where minisite_id=site_id and created_at>=now()-interval '30 days'),
   'concluidos',(select count(*) from public.pedidos_cardapio where minisite_id=site_id and status='concluido' and created_at>=now()-interval '30 days'),
   'receita',(select coalesce(sum(total),0) from public.pedidos_cardapio where minisite_id=site_id and status='concluido' and created_at>=now()-interval '30 days')
  ),
  'fuso',coalesce(m.published_content->'comercio'->>'fusoHorario','America/Sao_Paulo')
 ) into resultado from public.minisites m where m.id=site_id;
 return resultado;
end $$;
revoke all on function public.nexa_operacao_dados(uuid) from public,anon,authenticated;
grant execute on function public.nexa_operacao_dados(uuid) to authenticated;

create or replace function public.nexa_operacao_acessos(site_id uuid, email text default null, remover uuid default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare alvo uuid; resultado jsonb;
begin
 perform 1 from public.minisites where id=site_id and owner_id=auth.uid();
 if not found then raise exception 'not_allowed'; end if;
 if remover is not null then
  delete from public.minisite_operadores where minisite_id=site_id and user_id=remover;
  insert into public.operacao_auditoria(minisite_id,user_id,acao,alvo) values(site_id,auth.uid(),'revogar_acesso',remover);
 elsif email is not null then
  select id into alvo from auth.users where lower(auth.users.email)=lower(trim(nexa_operacao_acessos.email)) and email_confirmed_at is not null limit 1;
  if alvo is null then raise exception 'registered_account_required'; end if;
  if alvo=auth.uid() then raise exception 'already_owner'; end if;
  if (select count(*) from public.minisite_operadores where minisite_id=site_id)>=20 then raise exception 'access_limit'; end if;
  insert into public.minisite_operadores(minisite_id,user_id,created_by) values(site_id,alvo,auth.uid()) on conflict do nothing;
  insert into public.operacao_auditoria(minisite_id,user_id,acao,alvo) values(site_id,auth.uid(),'conceder_acesso',alvo);
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'criadoEm',o.created_at)),'[]'::jsonb) into resultado
 from public.minisite_operadores o join auth.users u on u.id=o.user_id where o.minisite_id=site_id;
 return resultado;
end $$;
revoke all on function public.nexa_operacao_acessos(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.nexa_operacao_acessos(uuid,text,uuid) to authenticated;

create or replace function public.nexa_atualizar_status_pedido(requested_id uuid, requested_status text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.pedidos_cardapio%rowtype;
begin
 select * into p from public.pedidos_cardapio where id=requested_id for update;
 if p.id is null or not public.nexa_pode_operar_site(p.minisite_id) then raise exception 'not_allowed'; end if;
 if requested_status=p.status then return jsonb_build_object('id',p.id,'status',p.status); end if;
 if not ((p.status='novo' and requested_status in ('aceito','cancelado'))
  or (p.status='aceito' and requested_status in ('preparo','cancelado'))
  or (p.status='preparo' and requested_status in ('pronto','cancelado'))
  or (p.status='pronto' and ((p.modalidade='entrega' and requested_status='em_rota') or (p.modalidade<>'entrega' and requested_status='concluido') or requested_status='cancelado'))
  or (p.status='em_rota' and requested_status in ('concluido','cancelado'))) then raise exception 'invalid_transition'; end if;
 update public.pedidos_cardapio set status=requested_status where id=p.id;
 insert into public.operacao_auditoria(minisite_id,user_id,acao,alvo) values(p.minisite_id,auth.uid(),'pedido:'||requested_status,p.id);
 return jsonb_build_object('id',p.id,'status',requested_status);
end $$;
revoke all on function public.nexa_atualizar_status_pedido(uuid,text) from public,anon,authenticated;
grant execute on function public.nexa_atualizar_status_pedido(uuid,text) to authenticated;

create or replace function public.nexa_operacao_atualizar(site_id uuid,tipo text,alvo uuid,estado text,dia date default null,hora text default null)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare conteudo jsonb; fuso text; instante timestamptz;
begin
 if not public.nexa_pode_operar_site(site_id) then raise exception 'not_allowed'; end if;
 if tipo='solicitacao' and estado in ('novo','lido','arquivado') then
  update public.form_submissions set status=estado::public.nexa_submission_status where id=alvo and minisite_id=site_id;
 elsif tipo='agenda' and estado='cancelado' then
  update public.agendamentos set status='cancelado' where id=alvo and minisite_id=site_id and status='confirmado';
 elsif tipo='agenda' and estado='reagendar' then
  if dia is null or dia<current_date or hora is null or hora!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'invalid_schedule'; end if;
  select coalesce(published_content,draft_content) into conteudo from public.minisites where id=site_id;
  fuso:=coalesce(conteudo->'comercio'->>'fusoHorario','America/Sao_Paulo');
  if fuso not in ('America/Sao_Paulo','America/Manaus','America/Rio_Branco','America/Noronha') then fuso:='America/Sao_Paulo'; end if;
  instante:=(dia+hora::time) at time zone fuso;
  if instante<=now() or instante>now()+interval '90 days' or not public.nexa_loja_aberta(conteudo,instante) then raise exception 'invalid_schedule'; end if;
  update public.agendamentos set data=dia,hora=nexa_operacao_atualizar.hora where id=alvo and minisite_id=site_id and status='confirmado';
 else raise exception 'invalid_action'; end if;
 if not found then raise exception 'not_found'; end if;
 insert into public.operacao_auditoria(minisite_id,user_id,acao,alvo) values(site_id,auth.uid(),tipo||':'||estado,alvo);
end $$;
revoke all on function public.nexa_operacao_atualizar(uuid,text,uuid,text,date,text) from public,anon,authenticated;
grant execute on function public.nexa_operacao_atualizar(uuid,text,uuid,text,date,text) to authenticated;

-- Acompanhamento público usa somente os tokens aleatórios do navegador, sem contato/endereço.
create or replace function public.nexa_meus_pedidos_cardapio(requested_slug text, requested_tokens uuid[])
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'codigo',p.codigo,'status',p.status,'modalidade',p.modalidade,'total',p.total,'createdAt',p.created_at,'updatedAt',p.updated_at,'agendadoPara',p.agendado_para,'itens',p.itens,'trackingToken',p.tracking_token) order by p.created_at desc),'[]'::jsonb)
 from public.pedidos_cardapio p join public.minisites m on m.id=p.minisite_id
 where m.slug=lower(trim(requested_slug)) and m.status='publicado'
 and (m.expires_at is null or m.expires_at>now())
 and public.nexa_plan_allows_public_site(m.owner_id)
 and cardinality(coalesce(requested_tokens,'{}'::uuid[])) between 1 and 20
 and p.tracking_token=any(coalesce(requested_tokens,'{}'::uuid[]))
$$;
revoke all on function public.nexa_meus_pedidos_cardapio(text,uuid[]) from public,anon,authenticated;
grant execute on function public.nexa_meus_pedidos_cardapio(text,uuid[]) to anon,authenticated;
