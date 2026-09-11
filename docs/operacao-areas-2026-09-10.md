# Áreas da operação por loja

- Pedidos: carrinho habilitado ou seção de cardápio ativa.
- Agenda: agenda habilitada e seção de agenda ativa. Um formulário do tipo agendamento continua sendo uma solicitação, não uma reserva automática.
- Solicitações: formulário ativo (exceto o formulário específico de hospedagem, que grava reservas em outro fluxo).
- Histórico existente mantém a área acessível mesmo após desativar o recurso. Nenhum registro é excluído nem a autorização de loja é modificada.
- Estatísticas e gestão da equipe permanecem; equipe apenas para proprietário. Métricas de pedidos e seu botão de som ficam ocultos quando a loja não usa pedidos e não possui histórico.
- O servidor retorna somente três indicadores, após a autorização existente. Usa conteúdo publicado, com rascunho como alternativa quando não existe publicação. Não expõe o conteúdo completo do editor ao operador.
- A seleção de aba é normalizada quando a configuração muda; trocar de loja remonta o painel. Durante transição de implantação, resposta antiga sem indicadores mantém as abas existentes.

Validação: 412 testes aprovados, 18 integrações condicionais ignoradas; typecheck, lint (zero erros, 16 avisos anteriores) e build Vercel aprovados. Inclui cenários de cardápio, salão, formulário, rascunho, histórico, autorização e seleção de aba. Migração `20260911040000_operation_enabled_areas.sql` aplicada após dry-run restrito a ela.
