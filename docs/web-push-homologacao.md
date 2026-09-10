# Web Push da operação — implementação e ativação

## Estado desta entrega

Implementado localmente: opt-in por loja/dispositivo, fila no PostgreSQL, agendador de um minuto, envio Web Push no servidor, service worker e revogação conferida no momento do envio. **Ainda não homologado em produção, sem chaves configuradas ou migrações aplicadas nesta rodada.** Não anunciar como entrega real confirmada até completar a lista abaixo.

O service worker não intercepta requisições, não mantém cache do aplicativo e não transforma o checkout em fluxo offline. Os avisos contêm somente texto genérico e um link para a operação, sem nome, endereço ou telefone do cliente. Acesso aos detalhes exige login e autorização da loja.

## Configuração necessária (somente servidor)

1. Aplicar `20260911010000_store_web_push.sql` e `20260911020000_store_web_push_scheduler.sql` após conferir a lista de migrações pendentes. O projeto já usa `pg_cron` e `pg_net`; a segunda migração depende dessas extensões. Sem configuração, o cron não faz chamadas externas.
2. Gerar um par VAPID uma única vez com `web-push.generateVAPIDKeys()`. Guardar a chave privada em segredo na Vercel, nunca no Git nem em variável com prefixo `VITE_`.
3. Configurar `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT` (URL HTTPS real da Nexa) e `PUSH_DISPATCH_SECRET` (32 bytes aleatórios ou mais) no ambiente de produção da Vercel. Não reutilizar segredos de outros serviços.
4. Com service role, chamar `nexa_push_configure(requested_endpoint, requested_secret)`. O endpoint é a origem HTTPS real seguida de `/api/notifications/push-dispatch`; o segredo deve coincidir com `PUSH_DISPATCH_SECRET`. Essa configuração é inacessível a anon e authenticated e não aparece no comando do cron.
5. Publicar pelo fluxo normal do repositório para Vercel. Build validado com preset `vercel`; não transferir automaticamente a hospedagem para outro provedor.

## Homologação real obrigatória

- Autorizar notificações no dispositivo, ativar apenas uma loja, recarregar e confirmar persistência.
- Fechar a página de operação, enviar um pedido fictício autorizado de outro navegador e observar a notificação do sistema (o cron pode levar cerca de um minuto, além da latência do provedor).
- Abrir pelo aviso e confirmar que o link leva à loja correta, exigindo login quando necessário.
- Testar também formulário/agendamento/reserva com destinatários fictícios.
- Desativar uma loja e confirmar que as outras inscrições continuam válidas.
- Remover o operador ou transferir a propriedade antes de despachar um evento pendente e conferir que ele não recebe o aviso.
- Conferir rejeição de chamadas não autenticadas, endpoint externo/privado e usuário de outra conta. Não extrair ou registrar endpoints/chaves de usuários reais no relatório.
- Testar pelo menos Chrome desktop e um celular real. No iOS é necessário o aplicativo na Tela de Início. Navegador totalmente encerrado, economia de energia, permissões do sistema ou dispositivo offline podem atrasar/impedir entrega; não garantir aviso com computador desligado.

## Comportamento da fila e limites

- Até 20 trabalhos por chamada, até 6 tentativas, prazo de um dia para novos envios e TTL de uma hora no provedor. Falhas 404/410 removem a assinatura expirada; outras falhas têm espera exponencial.
- A concessão do trabalho dura dois minutos. Uma falha depois de o provedor aceitar e antes da confirmação no banco pode repetir o envio; a tag estável reduz duplicações visuais. Não prometer semântica de entrega exatamente uma vez.
- Os registros da fila são removidos após 30 dias. O limite atual é 10 dispositivos por conta. Alterar as chaves VAPID exige estratégia de reinscrição dos dispositivos existentes.
- O recebimento de e-mail/WhatsApp existente é independente deste canal e não comprova funcionamento de Web Push.

## Evidências locais

- Testes SQL isolados: autorização, opt-in, quatro fontes de eventos, transferência/revogação, cancelamento de inscrição, concessão e limite de tentativas; agendador testado com transporte HTTP simulado.
- Testes do servidor: origem/sessão/segredo, usuário autenticado, privacidade do payload, revogação posterior ao enfileiramento, expiração e repetição após erro temporário.
- Testes unitários não representam envio real a Google/Apple/Mozilla.

Referências de implementação: [web-push](https://github.com/web-push-libs/web-push), [Web Push FAQ](https://web.dev/articles/push-notifications-faq).
