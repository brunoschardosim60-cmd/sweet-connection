# Homologação complementar — 10/09/2026

## Resultado: parcial, não homologado integralmente em produção

O proprietário solicitou testar IA com fotos/logo, transferência para cliente pagante, ações administrativas e notificações com navegador fechado. Autorizou encerrar e desligar o computador se o uso disponível não permitisse concluir tudo. O uso consultado passou de 93% para 95% durante esta rodada. Não foram resgatados créditos de reset.

## Verificações executadas nesta rodada

- Transferência e limites de ajustes da IA: 14 testes passando em PostgreSQL isolado. Incluem assinatura ativa/plano compatível, transferência atômica, cópia sem histórico privado, saída do criador e bloqueio dos recursos pagos após rebaixamento. Isso não equivale a compra de assinatura ou transferência real em produção.
- Oito arquivos de testes de IA, transferência no servidor e apresentação administrativa: 97 testes passando. Provedor e serviços externos são simulados nesses testes.
- Acrescentados dois testes em `tests/ia-geracao-server.test.ts`: envio separado de logo e foto, com rótulos e bytes no corpo enviado ao Gemini; rejeição de referência externa e de resposta HTML como imagem. Arquivo atualizado: 16 testes passando. Os bytes são uma fixture técnica, não uma imagem submetida ao Gemini real.
- Total distinto desta seleção: 113 testes, incluindo os dois novos. Não somar a reexecução do mesmo arquivo como testes adicionais.
- TypeScript (`npm run typecheck`) e conferência de espaços do diff (`git diff --check`) sem erros.

## Pendências confirmadas

1. **IA multimodal real:** falta upload pelo usuário, geração real com logo/fotos e avaliação da associação das imagens aos produtos e da identidade visual. O teste técnico novo cobre o transporte, não a qualidade visual.
2. **Transferência pagante real:** ainda falta o fluxo completo com destinatário de teste elegível, cópia dos arquivos no armazenamento real, saída do criador e acesso posterior do cliente. Nenhuma assinatura foi contratada nem plano real alterado nesta rodada.
3. **Administração:** testes locais aprovados não homologam ações privilegiadas reais. É necessária uma sessão administrativa autorizada e alvos de teste isolados.
4. **Notificações com navegador fechado:** a implementação atual usa `new Notification` na página de operação. Não há implementação de service worker, assinatura Push ou VAPID encontrada no código pesquisado. Portanto esta capacidade ainda não existe; exige implementação e testes próprios. Não pode ser anunciada como funcionando com o navegador fechado.

## Condições de encerramento

- O inventário do navegador não disponibilizou Chrome nesta sessão, apenas Edge e a aba local do navegador interno. A sessão autenticada anterior não pôde ser reutilizada.
- Nenhuma alteração funcional, cobrança, troca de proprietário ou permissão administrativa realizada nesta rodada. Mudanças limitadas aos testes e a este relatório.
- Encerramento antecipado solicitado pelo usuário para preservar o uso restante. Desligamento do Windows será solicitado sem forçar fechamento de programas; aplicativos com trabalho não salvo podem impedir o desligamento.

O relatório anterior `auditoria-funcional-2026-09-10.md` mantém as evidências da auditoria anterior; suas verificações não foram repetidas como se fossem novas nesta rodada.

## Retomada após o pedido de conclusão

- Suíte local completa reexecutada: **377 testes passando e 14 de integração ignorados por falta de configuração**, em 40 arquivos (38 executados, 2 ignorados). Os 14 não foram homologados novamente nesta retomada.
- Chrome ainda ausente no inventário conectado; somente Edge e navegador interno disponíveis, sem a sessão autenticada anterior.
- A rota `src/routes/api/notifications/dispatch.ts` possui canais de e-mail (Resend) e WhatsApp, separados das notificações locais do navegador. Exigem suas respectivas credenciais e remetentes configurados. Sua existência não comprova entrega real, nem substitui Web Push. Não foram disparadas mensagens externas nesta retomada.
- Uso consultado: 96% consumido. Nenhum crédito de reset foi usado. As quatro pendências de ponta a ponta descritas acima continuam abertas; esta execução não as declara concluídas.
