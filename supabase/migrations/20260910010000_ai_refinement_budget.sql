-- A sessão assinada expira em 24h. Não reiniciar a contagem ao cruzar meia-noite.
create or replace function public.nexa_limite_ajuste_ia(chave text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare quantidade_atual integer;
begin
 if coalesce(auth.role(),'')<>'service_role' or chave not like 'ia-ajuste:%' or length(chave)>120 then raise exception 'not_allowed'; end if;
 insert into public.cotacoes_limites as c(chave,janela,quantidade) values(chave,now(),1)
 on conflict on constraint cotacoes_limites_pkey do update set quantidade=c.quantidade+1
 returning quantidade into quantidade_atual;
 return quantidade_atual<=3;
end $$;
revoke all on function public.nexa_limite_ajuste_ia(text) from public,anon,authenticated;
grant execute on function public.nexa_limite_ajuste_ia(text) to service_role;
