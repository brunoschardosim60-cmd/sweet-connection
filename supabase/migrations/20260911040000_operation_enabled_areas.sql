-- Áreas operacionais seguem recursos configurados; autorização e histórico preservados.
create or replace function public.nexa_operacao_dados(site_id uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare resultado jsonb; configuracao jsonb;
begin
 if not public.nexa_pode_operar_site(site_id) then raise exception 'not_allowed'; end if;
 select coalesce(published_content,draft_content,'{}'::jsonb) into configuracao from public.minisites where id=site_id;
 select jsonb_build_object(
  'recursosOperacao',jsonb_build_object(
   'pedidos',coalesce(configuracao #> '{comercio,carrinho}'='true'::jsonb,false) or coalesce(configuracao->'secoes' @> '[{"tipo":"cardapio","ativa":true}]'::jsonb,false),
   'agenda',coalesce(configuracao #> '{agenda,ativa}'='true'::jsonb,false) and coalesce(configuracao->'secoes' @> '[{"tipo":"agenda","ativa":true}]'::jsonb,false),
   'solicitacoes',coalesce(configuracao->'secoes' @> '[{"tipo":"formulario","ativa":true}]'::jsonb,false) and coalesce(configuracao->>'modeloId','') <> 'pousada-hotel'
  ),
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
  'camposFormulario',coalesce(m.published_content #> '{formulario,campos}',m.draft_content #> '{formulario,campos}','[]'::jsonb),
  'fuso',coalesce(m.published_content->'comercio'->>'fusoHorario','America/Sao_Paulo')
 ) into resultado from public.minisites m where m.id=site_id;
 return resultado;
end $$;
revoke all on function public.nexa_operacao_dados(uuid) from public,anon,authenticated;
grant execute on function public.nexa_operacao_dados(uuid) to authenticated;
