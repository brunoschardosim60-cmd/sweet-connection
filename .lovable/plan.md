# Refinamento visual da Operação Nexa

## Objetivo
Elevar a qualidade visual e a usabilidade da área **Operação das lojas**, mantendo a identidade areia/grafite/lima, todas as integrações reais e as regras atuais. O trabalho será estritamente de interface, responsividade e acessibilidade.

## O que será feito

### 1. Estrutura da operação
- Reorganizar o cabeçalho para destacar a loja selecionada, seu estado e a separação entre operação e criação.
- Melhorar o seletor de estabelecimento para múltiplas lojas, sem alterar permissões.
- Transformar Pedidos, Agenda, Solicitações, Estatísticas e Equipe em uma navegação clara, confortável no celular e sem rótulos cortados.
- Manter **Equipe e acessos** visível exclusivamente para proprietários, como já definido pela autorização existente.

### 2. Comandas de pedidos
- Reestruturar cada ficha para leitura rápida: número, horário, modalidade, agendamento e status no topo.
- Criar hierarquia clara para itens, adicionais, observações, entrega, contato, pagamento, frete e total.
- Dar destaque moderado e textual aos novos pedidos e diferenciar agendados sem depender apenas de cor.
- Ampliar os controles do checklist e preservar os checks locais durante atualizações automáticas.
- Manter uma única ação principal por etapa e cancelamento secundário com confirmação.
- Substituir o filtro compacto por controles com contadores e melhorar os estados vazios.
- Usar grade equilibrada no desktop e coluna única no celular.

### 3. Agenda, solicitações, estatísticas e acessos
- Agenda: separar data, horário, cliente, serviço e situação; organizar reagendamento e cancelamento.
- Solicitações: converter campos técnicos em rótulos legíveis e destacar pendências, sem inventar valores ausentes.
- Estatísticas: destacar o período e a vinculação à loja, separar volume, conversão operacional e valor de pedidos concluídos, com aviso explícito de que não representa pagamento recebido.
- Equipe: tornar claras as permissões, a exigência de conta confirmada, o papel do link e a revogação de acesso.

### 4. Entrega, agendamento e experiência do cliente
- Organizar a configuração por modo escolhido, com blocos claros para origem, bairros/regiões, faixas de distância, limite e fuso horário.
- Melhorar adição/edição de linhas e alvos de toque, sem preencher ou salvar exemplos automaticamente.
- Refinar carrinho e revisão para deixar etapas, agendamento, frete, total, envio e aceite visualmente distintos.
- Preservar os modais e proporções das demonstrações, com rolagem natural e sem barras visíveis.

## Acessibilidade e estabilidade
- Alvos interativos de pelo menos 44px, foco visível, rótulos acessíveis e mensagens sem depender só de cor.
- Respeitar redução de movimento.
- Evitar remounts durante digitação e impedir que atualizações automáticas desloquem a tela ou apaguem interações locais.

## Validação
- Executar os testes existentes e a verificação de tipos disponibilizada pelo projeto; a compilação automática da plataforma também será observada.
- Validar em 390px, 768px e 1440px, incluindo altura de notebook, verificando overflow, cortes, sobreposições, foco e regressões nas prévias.
- Testar telas autenticadas somente se houver sessão disponível; caso contrário, registrar claramente essa limitação.

## Limites preservados
- Nenhuma alteração em Supabase, migrations, RLS, autenticação, permissões, pagamentos, planos, APIs, persistência ou regras de negócio.
- Nenhum mock, pedido real, mensagem real ou concessão de acesso durante os testes.
