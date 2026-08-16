-- The owner requested a single immutable platform administrator. This database
-- invariant prevents a second admin even through privileged maintenance code.
create unique index if not exists user_roles_single_admin
  on public.user_roles (role)
  where role = 'admin';
