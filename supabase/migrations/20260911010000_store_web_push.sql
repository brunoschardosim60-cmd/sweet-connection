-- Private, opt-in device subscriptions. No customer data is included in push payloads.
create table public.nexa_push_devices (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
 endpoint text not null unique check(length(endpoint)<=2048), keys jsonb not null,
 created_at timestamptz not null default now()
);
create table public.nexa_push_stores (
 device_id uuid references public.nexa_push_devices on delete cascade,
 site_id uuid references public.minisites on delete cascade,
 primary key(device_id,site_id)
);
create table public.nexa_push_jobs (
 id uuid primary key default gen_random_uuid(), device_id uuid references public.nexa_push_devices on delete cascade,
 site_id uuid references public.minisites on delete cascade, source_id uuid not null, source_type text not null,
 status text not null default 'pending' check(status in ('pending','processing','sent','failed','skipped')),
 attempts int not null default 0, available_at timestamptz not null default now(), created_at timestamptz not null default now(),
 unique(device_id,source_id,source_type)
);
create index nexa_push_jobs_pending on public.nexa_push_jobs(available_at) where status in ('pending','processing');
alter table public.nexa_push_devices enable row level security;
alter table public.nexa_push_stores enable row level security;
alter table public.nexa_push_jobs enable row level security;
revoke all on public.nexa_push_devices,public.nexa_push_stores,public.nexa_push_jobs from public,anon,authenticated;
grant all on public.nexa_push_devices,public.nexa_push_stores,public.nexa_push_jobs to service_role;

create function public.nexa_push_subscription(requested_user uuid, requested_site uuid, requested_endpoint text, requested_keys jsonb, requested_action text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare device public.nexa_push_devices;
begin
 if requested_action not in ('status','enable','disable') then raise exception 'invalid_action'; end if;
 if not exists(select 1 from public.minisites m where m.id=requested_site and (m.owner_id=requested_user or exists(select 1 from public.minisite_operadores o where o.minisite_id=m.id and o.user_id=requested_user))) then raise exception 'not_allowed'; end if;
 select * into device from public.nexa_push_devices where endpoint=requested_endpoint for update;
 if device.id is not null and device.user_id<>requested_user then raise exception 'device_other_account'; end if;
 if requested_action='enable' then
   if device.id is null and (select count(*) from public.nexa_push_devices where user_id=requested_user)>=10 then raise exception 'device_limit'; end if;
   insert into public.nexa_push_devices(user_id,endpoint,keys) values(requested_user,requested_endpoint,requested_keys)
   on conflict(endpoint) do update set keys=excluded.keys where nexa_push_devices.user_id=requested_user returning * into device;
   if device.id is null then raise exception 'device_other_account'; end if;
   insert into public.nexa_push_stores values(device.id,requested_site) on conflict do nothing;
 elsif requested_action='disable' then
   delete from public.nexa_push_stores where device_id=device.id and site_id=requested_site;
   delete from public.nexa_push_jobs where device_id=device.id and site_id=requested_site and status in ('pending','processing');
   if not exists(select 1 from public.nexa_push_stores where device_id=device.id) then delete from public.nexa_push_devices where id=device.id; end if;
 end if;
 return exists(select 1 from public.nexa_push_stores where device_id=device.id and site_id=requested_site);
end $$;
revoke all on function public.nexa_push_subscription(uuid,uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.nexa_push_subscription(uuid,uuid,text,jsonb,text) to service_role;

create function public.nexa_push_enqueue() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 insert into public.nexa_push_jobs(device_id,site_id,source_id,source_type)
 select d.id,new.minisite_id,new.id,tg_argv[0] from public.nexa_push_stores s
 join public.nexa_push_devices d on d.id=s.device_id join public.minisites m on m.id=s.site_id
 where s.site_id=new.minisite_id and (m.owner_id=d.user_id or exists(select 1 from public.minisite_operadores o where o.minisite_id=m.id and o.user_id=d.user_id))
 on conflict do nothing;
 return new;
end $$;
revoke all on function public.nexa_push_enqueue() from public,anon,authenticated;
create trigger nexa_push_order after insert on public.pedidos_cardapio for each row execute function public.nexa_push_enqueue('pedido');
create trigger nexa_push_form after insert on public.form_submissions for each row execute function public.nexa_push_enqueue('formulario');
create trigger nexa_push_agenda after insert on public.agendamentos for each row execute function public.nexa_push_enqueue('agendamento');
create trigger nexa_push_booking after insert on public.reservas_hospedagem for each row execute function public.nexa_push_enqueue('reserva');

create function public.nexa_push_claim() returns setof public.nexa_push_jobs language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 update public.nexa_push_jobs set status='failed' where status in ('pending','processing') and available_at<=now() and (attempts>=6 or created_at<now()-interval '1 day');
 return query update public.nexa_push_jobs set status='processing',attempts=attempts+1,available_at=now()+interval '2 minutes'
 where id in(select id from public.nexa_push_jobs where status in ('pending','processing') and available_at<=now() and attempts<6 order by available_at for update skip locked limit 20)
 returning *;
end;
$$;
revoke all on function public.nexa_push_claim() from public,anon,authenticated;
grant execute on function public.nexa_push_claim() to service_role;
