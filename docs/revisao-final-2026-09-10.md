# Revisão final — escopo executado e limites

## Concluído nesta rodada

- Sessão persistente testada no Chrome real: fechei a aba autenticada, criei outra sem opener e abri o mesmo endereço de operação. A loja entrou sem novo login e a inscrição de avisos continuou ativa. Não li nem exportei tokens do navegador.
- A entrega real de Web Push com a página fechada já foi comprovada pela captura enviada pelo usuário. O clique abriu o identificador correto da loja. A nova prova de restauração de sessão foi por navegação ao mesmo endereço, não por outro clique observado no aviso.
- Permissões: distinção entre bloqueio (`denied`) e ausência de decisão (`default`); pedido nativo apenas durante clique, sem insistir quando bloqueado; erro visível na página, sem depender de toast temporário. Ativação agora só anuncia sucesso após confirmação do servidor.
- Cobrança: cancelamento consulta a assinatura antes da exclusão para preservar o período de acesso. Cancelamento já registrado não é reenviado. Falhas de persistência no cancelamento ou webhook não retornam sucesso; falha ao consultar checkout gera resposta recuperável, em vez de descartar o evento. Testes simulados cobrem autenticação, estado consultado no provedor, gravações, cancelamento e falhas.
- Endpoints de checkout, cancelamento, webhook Asaas e dispatcher de push foram consultados sem autenticação em produção: todos retornaram 401. Nenhuma cobrança foi criada por esses testes.
- Dependências atualizadas dentro das linhas compatíveis: Vitest/coverage 4.1.11, Wrangler 4.131.0 e transitivas corrigidas (js-yaml 4.3.2, sharp 0.35.4). npm e Bun lockfiles sincronizados. `npm audit` passou de sete alertas para zero vulnerabilidades conhecidas; isso não prova ausência de falhas no aplicativo.
- Validação final: **428 testes passaram**, 18 testes de integração condicionais ignorados nesta execução padrão. Typecheck aprovado; lint sem erros, com 16 avisos preexistentes; build de produção Vercel aprovado após atualizar dependências.

## Limpeza autorizada

- Desativada pela interface somente a inscrição de avisos da loja fictícia.
- Excluído pela interface o rascunho `39edf9e8-9776-4552-8b32-b7d4d4e64a00`, com seus dois atendimentos fictícios e vínculos. Conferência remota confirmou zero sites, formulários e inscrições restantes para esse identificador.
- Removidos somente os dois uploads criados nesta homologação: mídias `1cc40847-0c45-4e85-8d46-eb1417848f56` e `afbfad30-bed9-4d87-89c5-89f562cccfda`, no bucket nexa-media. Os arquivos originais `public/favicon.png` e `src/assets/seg-doceria.webp` continuam no repositório.
- Não excluí a loja real `dsd`, contas reais, outras mídias nem projetos de auditorias anteriores. O rascunho e seu histórico não têm recuperação pela interface; as imagens podem ser reenviadas a partir dos originais.

## Ainda não homologado — não declarar concluído

1. **Chrome totalmente fechado:** o navegador permaneceu aberto com abas pessoais. Foi solicitado ao usuário fechar suas janelas após salvar o trabalho; não houve confirmação nem fechamento forçado. Receber com a página fechada não comprova receber com o processo encerrado.
2. **Celular físico:** nenhum Android/iPhone foi disponibilizado. Viewport responsivo não substitui inscrição e entrega no dispositivo, nem valida as condições próprias do iOS.
3. **Contratação, renovação e cancelamento financeiros reais:** ambiente configurado usa Asaas de produção, sem ASAAS_API_URL de sandbox. Nenhum cartão, CPF, cobrança ou assinatura real foi utilizado. Exige sandbox com credenciais próprias ou transação com plano, valor e pagador autorizados, concluída de forma controlada pelo titular. Renovação exige tempo/ciclo ou mecanismo oficial de sandbox, não simular mudança de plano no banco como se fosse pagamento.
4. **Conciliação financeira de falhas parciais:** webhook e cancelamento envolvem provedor externo e mais de uma gravação, sem uma transação distribuída. Se o provedor cancelar e o banco falhar, a rotina agora informa falha, mas ainda precisa conciliação/reprocessamento controlado. Também falta homologar eventos antigos/fora de ordem de assinaturas anteriores antes de declarar o ciclo financeiro robusto de ponta a ponta.

Não há base para afirmar “não falta mais nada”. As melhorias e os testes locais estão concluídos; os quatro itens acima são limites explícitos desta entrega, não testes aprovados.

## Referências de cobrança consultadas

A consulta pontual da assinatura é suportada pelo [GET de assinatura do Asaas](https://docs.asaas.com/reference/recuperar-uma-unica-assinatura). A exclusão interrompe a recorrência e possui consequências para cobranças pendentes, conforme [remoção de assinatura](https://docs.asaas.com/reference/remover-assinatura). Por isso não foi feita uma exclusão de assinatura real para demonstrar o teste.
