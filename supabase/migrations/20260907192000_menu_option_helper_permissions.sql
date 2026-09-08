-- O Supabase pode conceder EXECUTE diretamente aos papéis de API por padrão.
-- O cálculo interno é chamado apenas pela RPC de pedidos (security definer).
revoke all on function public.nexa_calcular_opcoes_produto(jsonb,jsonb) from anon, authenticated;
