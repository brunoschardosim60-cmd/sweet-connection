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

## Retomada autorizada com reset

- Após o usuário responder “sim”, um reset foi resgatado com sucesso: uso retornou a 0%, restando um crédito. Nenhum segundo reset foi utilizado.
- Chrome conectado novamente e login realizado pelo usuário. A criação com IA foi aberta com dados fictícios, sem criar/publicar outro projeto. O envio de logo pela interface foi bloqueado pela extensão (`Not allowed`); foi solicitado habilitar acesso a URLs de arquivos. Não houve geração multimodal real nesta etapa.
- Implementado Web Push localmente; detalhes em `web-push-homologacao.md`. A suíte completa passou com **393 testes e 14 integrações ignoradas**. Typecheck sem erros; ESLint sem erros e 16 avisos preexistentes. Build com preset Vercel aprovado antes do último ajuste de carregamento da chave pública no componente.
- As duas novas migrações foram testadas em PostgreSQL isolado, mas ainda **não aplicadas no Supabase**. As chaves VAPID e o segredo do despachante ainda não foram configurados. A implementação não foi publicada para substituir os avisos existentes antes de configurar e validar a entrega real.
- Vercel autenticada no navegador; login do CLI oficial iniciado e pendente de autorização explícita para “Allow Access”. Não foram extraídos cookies nem credenciais do navegador.
- Solicitada autorização específica para contas fictícias com plano temporário, sem cobrança, visando homologar transferência. Não foram criadas nem promovidas essas contas enquanto a autorização estava pendente. Administração privilegiada real também continua não homologada.
- Auditoria de dependências identificou aviso alto em `js-yaml`, dependência transitiva já presente na cadeia do TanStack/build; não foi feita atualização geral de dependências como parte desta alteração de notificações.

## Transferência real e configuração autorizadas

- Usuário autorizou prosseguir com CLI e planos temporários. Login do CLI Vercel concluído. Projeto existente `nexa` vinculado; nenhuma nova hospedagem criada.
- Migrações `20260911010000` e `20260911020000` aplicadas após dry-run que mostrou somente essas duas pendências. Chaves VAPID e segredo aleatório configurados na Vercel, apenas em produção; segredo do despachante configurado no PostgreSQL sem exposição em logs ou Git.
- Teste remoto `handoff-live-authorized.test.ts`: **4 testes passaram**, usando contas fictícias com direito temporário ao plano Catálogo e a API publicada real. Não testou contratação/pagamento; nenhuma cobrança foi realizada.
- Verificado: bloqueio inicial da conta gratuita; aceite com plano compatível; imagem copiada para armazenamento do destinatário; mesmo slug publicado; cópia limpa em rascunho para criador; versões e histórico fictício preservados; aceite repetido idempotente; criador saiu da equipe e perdeu acesso operacional sem derrubar a loja; rebaixamento do destinatário pausou publicação e preservou histórico.
- A primeira execução falhou somente na preparação do teste de versões (nenhuma versão havia sido criada). Adicionada a criação explícita de versão antes da entrega; reexecução aprovada. Não se alterou o código de transferência para mascarar essa falha.
- Contas, sites e mídias fictícios dessas execuções foram removidos ao final, pelo fluxo de exclusão de conta. Os projetos preexistentes do usuário não foram alterados.
- Typecheck, lint (zero erros, 16 avisos existentes) e novo build com preset Vercel aprovados antes da publicação.

## Administração e saúde das notificações — continuação

- Na interface administrativa de produção, uma conta fictícia autorizada foi promovida a Essential, retornada a Free, suspensa com motivo de homologação e reativada. Os estados foram conferidos no servidor, e a conta foi removida ao final. Não houve cobrança nem anúncio enviado a usuários reais.
- Integrações remotas de segurança reexecutadas: 14 testes aprovados, com limpeza de contas e arquivos de teste.
- Web Push publicado e configurado: endpoint autenticado respondeu com fila vazia; chamada sem autenticação foi rejeitada. Isso comprova configuração do despachante, não recebimento no dispositivo.
- Corrigida a saúde administrativa para separar notificações ignoradas de falhas reais. Adicionadas contagens de Web Push na fila, com falha e aceitos pelo provedor. Migração 20260911030000 aplicada após dry-run restrito a ela.
- Validação local: 394 testes aprovados, 18 integrações condicionais ignoradas na execução padrão; typecheck e build Vercel aprovados. Lint sem erros após corrigir apenas formatação em dois testes, mantendo 16 avisos existentes.

## IA com logo e foto — teste real no Chrome

- Após o usuário liberar URLs de arquivos e entrar novamente, uploads reais pela interface funcionaram. Usados somente arquivos demonstrativos do próprio projeto: `public/favicon.png` como logo N e `src/assets/seg-doceria.webp` como foto de vitrine.
- Uma geração multimodal real produziu três direções visuais verde-lima, preservou os preços informados (R$ 89,90 e R$ 39,90), exibiu a logo e associou a foto ao bolo, mantendo o segundo produto sem foto. A correspondência visual de produto continua sujeita à revisão humana, pois a imagem é uma vitrine com vários doces.
- Detectado FAQ que prometia agendamento pelo site sem configuração operacional confirmada. Os dois FAQs foram removidos da proposta antes de aprová-la. Reforçada a instrução do gerador para FAQ/SEO/descrições não tratarem o objetivo comercial como função já habilitada; teste de regressão do prompt adicionado (17 testes do arquivo aprovados). Não se considera essa instrução uma garantia contra toda alucinação futura; exige revisão.
- Proposta aprovada e salva no editor como **rascunho**, id `39edf9e8-9776-4552-8b32-b7d4d4e64a00`, slug `homologacao-ia-visual-nexa`. Logo, produtos e preços visíveis após navegação ao editor; tabela de clientes confirmou rascunho. Não houve publicação desse negócio fictício nem contato com o número demonstrativo.
- Correções funcionais publicadas em `main`, implantação Vercel confirmada para `eed6b71`. Build Vercel aprovado após o ajuste de IA.
- Na operação exclusiva do rascunho, ativação de avisos retornou “Permita notificações nas configurações do navegador para ativar os avisos.” Solicitada liberação manual para o domínio da Nexa. Nenhum evento de teste foi enviado sem dispositivo inscrito. O rascunho e suas duas mídias foram mantidos para continuar esse teste; remover ao concluir.
- **Pendente:** inscrição do dispositivo e observação de notificação real com a página fechada (e, separadamente, navegador fechado). Aceitação do provedor e teste do despachante não substituem essa observação.

## Web Push após liberação pelo usuário

- O usuário liberou notificações do domínio. A interface confirmou inscrição com o botão “Desativar avisos desta loja” ativo; exatamente um dispositivo inscrito para o rascunho de homologação.
- Fechada somente a aba da Nexa. Inserido um formulário fictício autorizado, id `6359aeb2-cfa5-499d-b9b4-55e3e2221086`, exclusivamente no rascunho de teste. Sem compra, pagamento ou contato real.
- Fila observada inicialmente `pending`, zero tentativas. O agendador real enviou automaticamente: estado `sent`, uma tentativa, sem chamada manual do despachante. Isso comprova aceitação pelo provedor com a página fechada.
- Solicitado ao usuário confirmar visualização no Windows e clicar no aviso. Recebimento visual, destino após clique e navegador totalmente encerrado continuam pendentes dessa observação. Não foram fechadas as demais abas ou o Chrome inteiro.

## Recebimento confirmado e persistência opcional

- O usuário enviou captura da notificação real “Nexa — novo atendimento” no Windows, confirmando entrega com a página fechada. Reenvio fictício `477f9ec0-e881-42b8-aa94-68c7842c6924` aceito pelo provedor após chamada autenticada do despachante.
- Após clicar, a captura do usuário mostrou `/operacao?site=39edf9e8-9776-4552-8b32-b7d4d4e64a00`, o destino correto, solicitando login. A causa foi confirmada no código: sessão exclusiva em sessionStorage, encerrada ao fechar a aba; retorno à loja preservado pelo login.
- Com autorização “sim”, adicionada opção desmarcada por padrão “Manter conectado neste dispositivo”, por até 30 dias. Armazena a sessão somente após login bem-sucedido e consentimento, nunca a senha. Uma conta lembrada por vez; abas existentes mantêm sua identidade. Renovações respeitam o vínculo da conexão; sair remove a conexão lembrada correspondente e impede restauração na aba deslogada. Expiração ou bloqueio do armazenamento não libera acesso sem autenticação.
- Testes locais: 401 aprovados, 18 integrações condicionais ignoradas. Inclui seis novos cenários de persistência/isolamento/saída/renovação/expiração/armazenamento bloqueado. Typecheck, lint (zero erros, 16 avisos existentes) e build Vercel aprovados.
- Próxima homologação: login real com a opção marcada e reabertura da operação após fechar a aba. Navegador completamente encerrado ainda não testado.
