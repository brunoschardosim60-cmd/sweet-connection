# Cardápio e mini-site — entrega e publicação

## Implementado

- Grupos de personalizações no editor: mínimo, máximo e acréscimo por opção.
- Detalhe do produto com foto ampliável, opções reais, quantidade e observação por preparo.
- Carrinho separa preparos diferentes e reúne somente configurações/observações iguais.
- Checkout em quatro etapas: recebimento, dados, pagamento e revisão.
- Pedido mínimo e taxa visíveis; taxa zero é grátis, taxa não definida não é tratada como grátis.
- Preços e escolhas recalculados no servidor, estoque compartilhado entre preparos e chave reutilizada em tentativas de envio.
- Preparos aparecem separadamente também no acompanhamento do pedido.
- Mini-site com CTA conforme as seções ativas, serviço levado à agenda/formulário, capa e apresentação lado a lado no desktop e serviços em duas colunas.
- Modais contidos nas molduras de celular, tablet e desktop; rolagem interna sem barra visível.
- Exemplos de opções em hamburgueria, pizzaria e doceria; IDs de formulário estáveis nas demonstrações.

## Validação

- Suíte de publicação: 222 testes passaram, mais 2 regressões de SSR/fuso; 13 testes de integração/RLS permaneceram ignorados. TypeScript sem erros; lint sem erros, com 15 avisos de Fast Refresh.
- Navegador: dois preparos do mesmo hambúrguer (R$ 47,90 e R$ 36,90), total R$ 84,80 e quatro etapas até revisão. Envio real bloqueado na demo.
- Navegador: observação mantém foco, foto amplia dentro da prévia e CTA seleciona o serviço na agenda.
- Inspeção responsiva: mini-site a 390 e 1440 px, cardápio a 768 px, sem overflow horizontal da página nesses cenários.
- PostgreSQL isolado (PGlite): preço adulterado ignorado, opções inválidas rejeitadas, preparos separados, estoque atômico, idempotência, taxa indefinida e serviço preservado no formulário.
- O banco isolado usa estrutura mínima e funções substitutas de autenticação/plano/hash; não substitui testes de RLS ou integração no Supabase real.

## Banco de produção

Migrações aplicadas no projeto vinculado `vsnvzgcotnrxrbztrxlp`, após conferir histórico e dry-run:

1. `supabase/migrations/20260907190000_menu_customizations_v2.sql`
2. `supabase/migrations/20260907191000_form_selected_service.sql`
3. `supabase/migrations/20260907192000_menu_option_helper_permissions.sql`

Conferência remota: RPC `nexa_criar_pedido_cardapio_v2` disponível para visitantes e função auxiliar de cálculo privada. A terceira migration remove concessões diretas feitas pelas permissões padrão do Supabase.

Publicação do front-end pelo fluxo GitHub → Vercel da `main`, após aprovação do build com preset Vercel. Não foram criados pedidos, agendamentos ou contatos reais.

Domínio público: https://nexa-xi-puce.vercel.app. O domínio antigo cadastrado no GitHub retorna 404. Verificação HTTP: início, modelos, demonstrações e login retornam 200. O smoke test publicado identificou diferença de data/fuso na hidratação; cardápio, agenda e data mínima de reserva agora adiam cálculos locais até a montagem no navegador, com testes de regressão de SSR.

Após aplicar em homologação, testar com conta autenticada: configurar opções no editor, salvar/publicar, fazer pedido de teste autorizado, conferir no painel, verificar estoque e Meus pedidos. O editor autenticado e a integração remota continuam pendentes de validação real.
