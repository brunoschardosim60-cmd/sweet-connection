-- O ciclo contratado precisa ficar no perfil para a pessoa e o administrador
-- distinguirem uma assinatura mensal de uma anual depois do webhook de pagamento.
alter table public.profiles
  add column if not exists billing_cycle text not null default 'monthly'
  check (billing_cycle in ('monthly', 'annual'));

update public.profiles p
set billing_cycle = (
  select b.billing_cycle
  from public.billing_checkout_sessions b
  where b.owner_id = p.id
    and b.status = 'paid'
  order by b.paid_at desc nulls last, b.updated_at desc
  limit 1
)
where p.billing_cycle = 'monthly'
  and exists (
    select 1
    from public.billing_checkout_sessions b
    where b.owner_id = p.id and b.status = 'paid'
  );
