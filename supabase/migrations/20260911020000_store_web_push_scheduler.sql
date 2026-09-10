-- Configured by service role only. No secret is embedded in migration history or cron commands.
create table public.nexa_push_config (
 singleton boolean primary key default true check(singleton), endpoint text not null, dispatch_secret text not null
);
alter table public.nexa_push_config enable row level security;
revoke all on public.nexa_push_config from public,anon,authenticated;
grant all on public.nexa_push_config to service_role;
create function public.nexa_push_configure(requested_endpoint text, requested_secret text) returns void
language sql security definer set search_path=pg_catalog,public as $$
 insert into public.nexa_push_config(singleton,endpoint,dispatch_secret) values(true,requested_endpoint,requested_secret)
 on conflict(singleton) do update set endpoint=excluded.endpoint,dispatch_secret=excluded.dispatch_secret;
$$;
revoke all on function public.nexa_push_configure(text,text) from public,anon,authenticated;
grant execute on function public.nexa_push_configure(text,text) to service_role;
create function public.nexa_push_wake() returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare config public.nexa_push_config;
begin
 delete from public.nexa_push_jobs where created_at<now()-interval '30 days';
 select * into config from public.nexa_push_config limit 1;
 if config.singleton and exists(select 1 from public.nexa_push_jobs where status in ('pending','processing') and available_at<=now()) then
   perform net.http_post(url:=config.endpoint,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||config.dispatch_secret),body:='{}'::jsonb,timeout_milliseconds:=30000);
 end if;
end $$;
revoke all on function public.nexa_push_wake() from public,anon,authenticated;
grant execute on function public.nexa_push_wake() to service_role;
select cron.schedule('nexa-web-push', '* * * * *', 'select public.nexa_push_wake()');
