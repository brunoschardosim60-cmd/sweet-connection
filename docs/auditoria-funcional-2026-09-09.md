# Auditoria Nexa — 9 de setembro de 2026

## Resultado e limite desta rodada

**Auditoria parcial, não homologação completa.** Foram testadas páginas públicas em produção e o checkout de demonstração no Chrome, revisados os fluxos no código e implementadas correções locais. O navegador não tem sessão de administrador. Criação persistida, geração real com IA, recebimento de pedido pela loja e cotação real de entrega ainda precisam do login solicitado ao proprietário.

As alterações desta rodada estão no workspace, ainda **não publicadas**. Os resultados de navegação abaixo correspondem à versão que estava em produção antes dessas alterações. Não foi criada uma loja real, enviado pedido ao estabelecimento, feita cobrança, alterado plano ou transferida propriedade.

## Páginas solicitadas

| Área | Evidência desta rodada | Situação |
| --- | --- | --- |
| Nexa `/` | Página aberta em produção; títulos e medidas de largura em três tamanhos | Verificada parcialmente; não foi feita auditoria completa de todos os links |
| Início `/painel` | Navegação redirecionou para login; layout e visão geral revisados no código | Teste autenticado pendente |
| Clientes `/painel/clientes` | Revisados filtros, duplicação e ações de gerenciamento no código | Persistência, importação e ações reais não exercitadas |
| Operação `/operacao` | Sem sessão, mostra entrada e explica acesso por loja; revisados recebimento, atualização e permissões no código | Recebimento real pendente |
| Modelos `/painel/modelos` | Detectada diferença em relação à galeria pública; organização corrigida localmente | Validação visual autenticada pendente |
| Mídias `/painel/midias` | Revisados upload, erro, listagem e exclusão no código | Upload real pendente; nenhum arquivo do usuário removido |
| Minha conta `/painel/configuracoes` | Detectados textos desatualizados; corrigidos localmente | Gravação autenticada pendente; ações destrutivas não testadas |
| Meu plano `/painel/meu-plano` | Revisados dados de assinatura, benefícios e acesso ao fluxo financeiro | Sem cobrança, upgrade, cancelamento ou reembolso de teste |
| Administração `/painel/admin` | Rota encontrada e controle administrativo revisado no código | Acesso e ações como administrador não exercitados |

## Testes reais no navegador

### Galeria e visualização

- Galeria pública exibiu **35 mini-sites e 8 cardápios**, com entrada própria de criação com IA.
- As páginas `/`, `/modelos?tipo=cardapio` e `/demonstracao/cardapio-doceria` apresentaram **0 px de overflow horizontal** nas larguras 390, 768 e 1440 px, com altura de teste de 900 px. Essa medida não comprova, sozinha, legibilidade ou ausência de cortes internos.
- Troca das molduras celular, tablet e desktop funcionou na demonstração de doceria; não houve overflow horizontal externo observado.
- Em uma janela de **1366 × 577 px**, o ajuste automático exibiu o celular a **50%** e o tablet a **41%**. A moldura cabe, mas o texto fica pequeno. É uma pendência visual real, não um problema de resolução da foto. A opção de ampliar existe; não alterei novamente o dimensionamento nesta rodada.
- Nenhuma entrada de erro apareceu no trecho de console consultado da aba de teste. Isso não equivale a testar todas as rotas ou sessões.

### Pedido de demonstração

1. Abri os detalhes de “Bolo de brigadeiro”. A descrição e o grupo obrigatório “Embalagem” apareceram.
2. Sem selecionar embalagem, adicionar ficou bloqueado.
3. Selecionar “Para presente” acrescentou R$ 5,00: **R$ 139,90 → R$ 144,90**.
4. A observação identificada como teste e a embalagem apareceram no carrinho.
5. Troquei para retirada, preenchi nome/telefone de teste e avancei para pagamento. O foco permaneceu no campo durante o preenchimento observado.
6. Selecionei Pix e avancei para revisão: item, personalização, observação, modalidade, pagamento e total estavam presentes.
7. A revisão exibiu **“Prévia · não envia pedidos”**, desabilitado, e informou que nenhum pedido seria enviado.

Não houve confirmação antecipada nesse percurso. **Ainda não foi testada a confirmação real nem a chegada à loja.** O Pix nessa tela representa uma forma de pagamento combinada, não prova de pagamento processado.

## Correções implementadas no código

### Entrega por distância

- Acrescentados campos explícitos de cidade e UF ao checkout por distância, sem presumir a localização do visitante.
- A cotação requer rua/endereço, cidade e uma UF válida na interface.
- Endereço completo normalizado é utilizado tanto na cotação quanto no pedido e na revisão. Mudar cidade ou UF também invalida a cotação anterior.
- O link “Ver rota no Google Maps” passou a usar o mesmo destino completo.
- Editor e criação oferecem **“Usar endereço cadastrado da loja”** quando esse endereço existe. O criador continua podendo configurar outra saída, por exemplo uma cozinha ou depósito.
- Texto explica que a localização da loja não é detectada automaticamente e precisa ser conferida.

**O que o código já faz:** envia a origem configurada da loja e o destino ao Google Routes; solicita distância por rota de carro; escolhe a menor faixa de quilômetros que comporta a distância; recusa endereços além da maior faixa. A chave permanece no servidor. A cotação é vinculada à loja, endereço e configuração, com validade e verificação no pedido.

**Limite:** os testes desta rodada do provedor usaram resposta simulada, não uma consulta real ao Google. Cidade/UF reduz a ambiguidade, mas ainda não confirma que o ponto geocodificado corresponde exatamente ao imóvel. Não há identificação automática por GPS implementada nesta alteração. Autocomplete, confirmação do ponto no mapa e tratamento de localização aproximada são melhorias futuras.

### Integrações e conta

- Google Analytics, Tag Manager e Meta Pixel passaram a aceitar somente IDs no formato permitido antes de montar scripts. Antes havia apenas remoção de espaços, insuficiente para um campo inserido em código.
- “Minha conta” deixou de orientar a republicação de projetos já publicados: a função de salvamento existente atualiza o conteúdo público; rascunhos continuam privados.
- Analytics/Pixel/GTM deixaram de aparecer como integrações futuras nessa página. A orientação agora direciona à configuração por projeto no editor.
- Recursos realmente futuros continuam identificados como tal, mas sem botões que apenas exibiam “em breve”.

### Modelos dentro do painel

- Separação entre **Mini-sites / Cardápios digitais / Criar com IA**, com segmento como filtro secundário.
- Contagem dos modelos encontrados e chips dos recursos, usando os mesmos presets da galeria pública.
- CTA explícito “Usar modelo pronto”; botões dos cards com altura mínima de 44 px.

## Validação técnica

- TypeScript: sem erros.
- Testes automatizados: **371 passaram; 13 ignorados**, em 39 arquivos (37 executados e 2 ignorados). Os ignorados não são evidência de aprovação.
- Incluídos testes de endereço completo, cidade/UF, mudança do destino, limite do endereço, payload de rota, renderização dos campos e validação de IDs de rastreamento.
- ESLint: 0 erros; 16 avisos existentes de Fast Refresh.
- Build Vercel local validado; build local não equivale a implantação em produção.
- Banco remoto: consulta de migrações com `--dry-run` retornou atualizado, sem migrações pendentes. Nenhuma migração foi aplicada nesta rodada.

## Próxima etapa: homologação com a conta aberta

1. Entrar como administrador no Chrome, sem enviar senha no chat.
2. Criar uma loja de teste claramente identificada, a partir de um modelo pronto; conferir dados preenchidos, fotos, edição, salvar e acesso público.
3. Fazer uma geração real de IA com briefing/logo/fotos de teste; conferir conteúdo, imagens, preços, propostas visuais e ajuste limitado. Testes automatizados não substituem essa avaliação de qualidade.
4. Configurar origem completa e faixas de entrega; cotar dois endereços públicos conhecidos e um fora da área, comparando distância e taxa. Não usar endereço de cliente real.
5. Enviar um pedido para a loja de teste. Confirmar estado inicial “Aguardando aceite”, recebimento na operação correta e transições até conclusão. Testar o retorno do status em “Meus pedidos”.
6. Conferir loja fechada, agendamento, edição de endereço após cotação, cotação expirada e duplo clique no envio.
7. Validar isolamento com uma segunda conta autorizada de teste, inclusive saída do criador e limites do plano. A conta administradora sozinha não comprova isolamento entre clientes.

## Prioridades futuras

1. Finalizar os testes autenticados acima antes de declarar o produto homologado.
2. Melhorar a legibilidade das demonstrações em telas baixas, sem voltar a cortar a moldura ou criar rolagem externa inesperada.
3. Confirmar origem/destino no mapa antes da cotação; tratar endereço impreciso e indisponibilidade do provedor com orientação clara.
4. Evoluir notificações da operação. Hoje o código consulta pedidos a cada 15 segundos com a página ativa; alerta sonoro depende de ativação pelo usuário. Isso não substitui push com o navegador fechado.
5. Revisar a consistência dos textos de planos e integrações em todas as áreas; confirmar os contatos públicos de suporte antes de divulgar amplamente.

