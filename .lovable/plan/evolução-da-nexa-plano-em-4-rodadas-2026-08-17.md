# Evolução da Nexa — plano em 4 rodadas

## Rodada 1 — Editor mais visual (só front-end)
- Arrastar e soltar real nas seções e nos itens do painel lateral (com botões de subir/descer mantidos como alternativa acessível).
- Destaque sutil na prévia: ao passar o mouse/focar num bloco do editor, a seção correspondente no celular ganha realce e rola até ela.
- Presets de cores em 1 clique na aba Aparência: Nox/Dark Gold, Clean Pastel, Neon Night, Café & Areia, Verde Menta, Mono Minimal — aplicam cor, fundo, tipografia e estilo de botão de uma vez.

## Rodada 2 — Vendas pelo WhatsApp
- Carrinho simples no mini-site: o visitante seleciona itens do cardápio/produtos, vê o total e gera uma mensagem de WhatsApp com o resumo do pedido.
- Opção por mini-site para ligar/desligar o carrinho e definir taxa de entrega e pedido mínimo.
- Agendamento rápido: escolha de dia e horário antes de abrir o WhatsApp, com botão "Adicionar ao Google Agenda".
- Campos de Pixel do Meta e Google Tag Manager na aba SEO, carregados apenas no mini-site publicado (não no editor).

## Rodada 3 — Agenda com bloqueio de horário (precisa de banco)
- Nova tabela de agendamentos por projeto, com regra de unicidade: um horário confirmado deixa de aparecer para os outros visitantes.
- Configuração de janela de atendimento, duração do serviço e intervalos por dia da semana.
- Confirmação envia mensagem pronta para o WhatsApp do negócio; a lista de agendamentos aparece dentro do painel (junto de Solicitações).
- Regras de acesso: cada dono vê só a agenda dos próprios projetos; visitante só cria e vê o próprio agendamento.

## Rodada 4 — App e desempenho
- Mini-site instalável no celular (ícone na tela inicial) com manifest gerado a partir do logo e das cores do projeto.
- Compressão e redimensionamento automático das imagens no envio (WebP), preservando o original quando necessário.
- Carregamento preguiçoso e tamanhos responsivos nas galerias e capas.

## Notas técnicas
- Rodadas 1, 2 e 4 (parte visual) não tocam em Supabase; a rodada 3 e o manifest dinâmico exigem migration e rota pública.
- Pixel/GTM ficam restritos ao mini-site publicado para não poluir métricas do painel.
- Todos os alvos de toque continuam ≥ 44px e os testes automatizados são estendidos a cada rodada.
