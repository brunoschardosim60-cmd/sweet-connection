# Nexa — auditoria autenticada e melhorias, 10/09/2026

## Resultado

Os fluxos centrais foram exercitados com dados fictícios no banco real: criação por modelo pronto, geração e refinamento de IA, publicação, atualização por Salvar, pedido agendado, recebimento e conclusão pela loja, formulário, agenda, permissões e Maps. Isso amplia a auditoria parcial de 09/09; não equivale a homologar todos os cenários possíveis.

O perfil disponibilizado no Chrome é uma conta comum com plano Catálogo, **não administrador**. Foram criadas duas contas gratuitas auxiliares, sem contratar planos ou realizar cobranças. Somente projetos e registros identificados como AUDITORIA foram alterados nos testes.

## Correções desta entrega

1. **Sessões realmente independentes por aba.** O teste de cadastro de outra conta revelou que o BroadcastChannel do Supabase alterava a identidade mostrada na primeira aba, apesar do armazenamento por sessão. Agora cada documento usa um canal independente e um adaptador preserva a chave estável da sessão. Login e logout de duas contas distintas foram testados sem recarregar a primeira aba; ela permaneceu na conta correta. Há cobertura de persistência, logout e PKCE.
2. **Leitura das prévias.** O botão “Ler” mostra conteúdo em tamanho real, sem transformar/encolher os textos. O conteúdo rola internamente; a opção “Moldura” volta à simulação completa do aparelho. A moldura padrão foi preservada para não reintroduzir os cortes anteriores. Na janela de 1366 × 577, a leitura ocupou 390 × 417 px, com o título a 24 px, sem overflow horizontal externo.
3. **Endereço do frete mais explícito.** Checkout por distância exige cidade e UF, mostra a origem configurada e oferece conferir saída/destino no Google Maps. Alterar o endereço ou a cidade desmarca a conferência e invalida a cotação anterior. O endereço completo é o mesmo na cotação, revisão e pedido. O editor permite reaproveitar o endereço cadastrado da loja.
4. **Resposta imprecisa do Maps.** O servidor consulta os indicadores de geocodificação e recusa correspondência parcial ou erro de origem/destino, com mensagens específicas. A distância continua sendo por rota de carro, não raio em linha reta. A chave fica no servidor. Referência: [Google Routes — GeocodedWaypoint](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes).
5. **Confirmação antiga no histórico.** O aviso inicial de pedido enviado deixa de anunciar “aguarda aceite” quando a lista já apresenta um estado posterior. O estado de cada pedido continua vindo do servidor.
6. **Pagamentos coerentes.** Novos cardápios e checkout usam Pix, cartão e dinheiro como padrão, coerente com o editor. “No balcão” só aparece quando configurado. Nenhum pagamento foi processado na auditoria.
7. **Solicitações legíveis na operação.** O teste real revelou códigos de campos no lugar de seus nomes. A consulta autorizada da operação agora inclui os rótulos do formulário; Nome, WhatsApp, Mensagem, Data desejada e Serviço de interesse foram verificados na interface local com o envio real. A migração não reescreve envios nem libera acesso ao editor.
8. **Avisos da operação.** Acrescentada ativação voluntária de avisos no computador e consulta em segundo plano quando habilitados. Os avisos não incluem dados pessoais do cliente e são encerrados ao sair da área. Requer permissão do navegador e a operação aberta; **não é push com o navegador fechado**. A entrega de uma notificação do sistema operacional não foi homologada neste navegador.
9. **Galeria e textos do painel.** Modelos organizados em Mini-sites / Cardápios digitais / Criar com IA, segmento secundário, contagem, benefícios e CTA “Usar modelo pronto”. Conferidos 35 mini-sites e 8 cardápios. Removidas orientações incorretas sobre republicação e textos que limitavam pedidos ao WhatsApp.
10. **Rastreamento mais seguro.** IDs de Analytics, Tag Manager e Pixel são validados antes da montagem de scripts. Configuração continua por projeto, para não misturar empresas.
11. **Clientes sem contador fictício.** A revisão final encontrou “0 visitas” vindo do snapshot do projeto, enquanto a operação tinha eventos reais. Essa coluna e o número no card foram substituídos por acesso direto à operação e aos resultados da loja, mantendo as estatísticas no ambiente correto.

## O que foi testado de verdade

| Fluxo | Evidência | Resultado |
| --- | --- | --- |
| Início e Clientes | Conta gratuita vazia; conta Catálogo com projetos; separação por usuário | Os projetos do proprietário não apareceram nas contas auxiliares |
| Modelos | Mini-sites, cardápios, contadores e recursos no painel local | 35 mini-sites e 8 cardápios; seleção funciona |
| Criação por modelo | Doceria criada pelo formulário real | Seis produtos e quatro categorias preenchidos; edição e publicação funcionaram |
| IA | Briefing de studio fictício, objetivo agendamento, dois serviços | Gerou manicure R$ 40/45 min e sobrancelhas R$ 35/30 min; três propostas visuais |
| Refinamento de IA | Pedido “somente visual”, verde sálvia e fundo claro | Mudou paletas e preservou nomes, valores e durações; aprovou e criou rascunho |
| Salvar publicado | Ativação de agenda e aviso no studio já publicado | Conteúdo público atualizou após Salvar e recarregar, sem republicação |
| Maps real | Origem Praça da Sé, 1, Sé, São Paulo | Destinos e resultados abaixo; chamadas reais ao endpoint de produção |
| Loja fechada | Checkout depois do horário de atendimento | Impediu pedido imediato; exigiu horário futuro |
| Pedido real de teste | Pedido #17, fatia R$ 16,90 + entrega R$ 7 | R$ 23,90; recebeu item, observação, endereço e agendamento; carrinho esvaziou |
| Atendimento | Novo → aceito → preparo → pronto → em rota → concluído | Cliente acompanhou aceite e conclusão em Meus pedidos |
| Formulário | Solicitação fictícia de manicure para 11/09 | Chegou ao studio, com serviço selecionado; marcada como lida |
| Agenda | Reserva fictícia em 11/09 às 10h | Apareceu na operação; horário ocupado e desabilitado em outra aba |
| Cancelamento | Comprovante público da reserva fictícia | Cancelou; 10h voltou a estar disponível |
| Estatísticas | Comparação studio/doceria | Studio sem pedidos; doceria com um concluído e R$ 23,90, identificado como valor de pedidos, não pagamento recebido |
| Colaborador | Compartilhamento apenas da doceria e depois do studio | Sem editor e sem outras empresas; sair de uma equipe manteve somente a outra |
| Transferência | Convite da doceria para conta gratuita | Exigiu Catálogo, bloqueou aceite, preservou proprietário; convite revogado pelo criador sem cobrança |
| Minha conta e Meu plano | Conta gratuita, limites e remoção de marca | Publicação/IA indicadas como bloqueadas; remoção de marca exige Catálogo |
| Admin | Rota no Chrome e chamadas reais com usuário comum/anon | Área restrita e funções administrativas negadas; não testadas ações como administrador |
| Mídias | Biblioteca no Chrome; upload/download/remoção reais via SDK | Arquivo PNG de teste enviado; outra conta não listou metadados nem sobrescreveu/apagou o arquivo; limpeza concluída |

### Cotações reais antes da publicação do novo tratamento de endereço

Faixas configuradas: até 5 km = R$ 7; até 15 km = R$ 12.

| Destino público usado no teste | Retorno |
| --- | --- |
| Avenida Paulista, 1578, São Paulo, SP / Bela Vista | 3,98 km, R$ 7, HTTP 200 |
| Avenida Pedro Álvares Cabral, São Paulo, SP / Ibirapuera | 8,84 km, R$ 12, HTTP 200 |
| Praça Bento Quirino, Campinas, SP / Centro | Fora da área, HTTP 422 |

O checkout também cotou a Paulista e gravou essa taxa no pedido #17. Esses resultados confirmam a integração real e a escolha da faixa; **não comprovam o ponto exato de todos os endereços possíveis**. A origem não é detectada magicamente: o criador precisa informá-la e conferi-la. Não foi implementado GPS nem autocomplete com seleção de pino nesta rodada.

### Conferência em produção depois da implantação

- A Vercel confirmou a publicação do código `b5ade7f` em main.
- Paulista permaneceu em 3,98 km/R$ 7 e Ibirapuera em 8,84 km/R$ 12, com o novo tratamento de geocodificação ativo.
- A consulta de Praça Bento Quirino passou a retornar `address_ambiguous`, recusando a aproximação antes de cobrar frete. Aeroporto Internacional de Guarulhos / Cumbica retornou `outside_delivery_area`.
- O botão “Ler” apareceu na demonstração pública. O proprietário continuou autenticado após recarregar a nova versão.
- “Meus pedidos” recuperou o pedido #17 como concluído, sem o aviso antigo de aguardando aceite, depois de sair e voltar à página.

## Validação técnica

- Suite local: 375 testes passando; os testes dependentes de credenciais são separados.
- Integração remota: 14 testes passaram (6 autenticados, 8 anônimos). As contas temporárias desses testes e o PNG foram removidos ao final.
- TypeScript sem erros; ESLint sem erros e 16 avisos existentes de Fast Refresh.
- Build Vercel local aprovado. Build local não é prova de implantação; a publicação em main e a conferência da versão pública encerram a entrega.
- Migração `20260910040000_operation_form_labels.sql` testada em PostgreSQL isolado e aplicada no Supabase. Só acrescenta rótulos à resposta autorizada da operação.
- Medidas reais do modo de leitura: 390 × 900, 767 × 900, 1440 × 900 e 1366 × 577, sem overflow horizontal externo. O zoom do Chrome exigiu compensação das medidas solicitadas; esses são os tamanhos efetivamente medidos no DOM.
- A captura de imagem do Chrome falhou por timeout da ferramenta; as novas medidas e interações foram verificadas pelo DOM, sem afirmar uma revisão visual pixel a pixel.

## Limites e próximos passos que permanecem

- Revisão de IA com logo e fotos enviadas, associação visual dos produtos e qualidade da imagem ainda precisa de homologação multimodal. A geração real desta rodada foi textual. Descrições produzidas pela IA continuam exigindo revisão do proprietário.
- Transferência concluída para destinatário com plano ativo, cópia de mídia e saída posterior do criador têm cobertura SQL, mas não foram executadas integralmente em produção. Não foi concedido plano pago artificialmente às contas auxiliares.
- Avisos com navegador fechado exigem implementação de Web Push/service worker e configuração própria. O botão novo não promete essa capacidade.
- Agenda reserva o horário configurado; duração variável por serviço, profissionais, buffers e capacidade simultânea precisam de desenho e testes específicos antes de serem anunciados.
- Upload foi validado no armazenamento e nas permissões. O seletor nativo de arquivo e a otimização visual ponta a ponta não foram homologados nesta sessão.
- Não foram feitos cobrança, assinatura, cancelamento financeiro, recuperação de senha por e-mail, ações administrativas privilegiadas ou carga concorrente de grande volume.
- Contatos públicos `contato@nexa.app`, Instagram `@nexa.app` e WhatsApp `(11) 98765-4321` precisam de confirmação do proprietário. Não foram substituídos por contatos inventados.
- Os rótulos de envios antigos usam a definição atual do formulário; preservar um snapshot histórico do rótulo no envio evita perda de contexto se o criador apagar/renomear campos depois.

## Dados de auditoria

- Doceria: `8b542be8-5dc7-4617-b477-770e33b2e353`, slug `auditoria-nexa-20260910`, pedido #17 concluído ficticiamente, R$ 23,90 **sem cobrança**.
- Studio IA: `1e239176-aa6a-4a4f-9a74-9f4e17b91116`, slug `auditoria-nexa-studio-ia-teste`, solicitação marcada como lida e reserva de 11/09 às 10h cancelada.
- Projetos de teste mantidos não publicados para consulta do proprietário: studio em rascunho e doceria pausada. Não são estabelecimentos reais. Os cinco projetos preexistentes não foram editados.
- As duas contas auxiliares de navegador foram excluídas permanentemente após confirmação de suas próprias senhas de teste. Isso não excluiu as lojas pertencentes ao proprietário. Nenhuma senha ou chave de API consta deste relatório.
