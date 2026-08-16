create or replace function public.handle_new_nexa_user()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 120), 'owner')
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'free'::public.app_role)
  on conflict (user_id, role) do nothing;

  if lower(coalesce(new.email, '')) = 'admnexa@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin'::public.app_role)
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$function$;