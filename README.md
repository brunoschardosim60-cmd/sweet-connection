# Nexa: Seu Negócio Online

Crie do zero uma aplicação web completa, moderna e extremamente bem trabalhada para uma plataforma brasileira de criação de mini-sites profissionais.

O nome provisório da plataforma será “Nexa”. Estruture o projeto para que o nome e a identidade visual possam ser alterados facilmente depois.

IMPORTANTE: não quero uma cópia visual da Coonexta, Linktree ou qualquer outra plataforma. Quero um produto com identidade própria, aparência premium e experiência muito superior aos criadores de “link na bio” tradicionais.

OBJETIVO DO PRODUTO

A Nexa permite criar mini-sites profissionais para empresas, lojas, restaurantes, prestadores de serviços e profissionais autônomos.

Inicialmente, a plataforma será utilizada apenas pelo administrador para criar os mini-sites dos clientes. Portanto, nesta primeira versão:

Não criar login ou cadastro.

Não utilizar banco de dados.

Não criar autenticação.

Não integrar pagamentos reais.

Não criar backend.

Utilizar dados simulados.

Utilizar localStorage para salvar clientes, configurações e alterações localmente.

Criar uma arquitetura preparada para receber Supabase ou outro banco de dados futuramente.

Todas as funções visuais devem funcionar no front-end.

Não deixar botões decorativos sem ação.

Quando uma função futura não puder ser concluída, exibir uma mensagem elegante informando “Recurso disponível em breve”.

A aplicação precisa parecer um produto real e quase pronto para comercialização, não apenas uma landing page bonita.

ESTRUTURA GERAL

Crie duas áreas principais:

Site público de apresentação da plataforma.

Painel interno utilizado pelo administrador para criar os mini-sites dos clientes.

Rotas sugeridas:

/ – landing page pública.

/modelos – galeria completa de modelos.

/painel – painel administrativo sem login.

/painel/novo – criação de novo cliente.

/painel/editor/:id – editor visual.

/site/:slug – mini-site público criado para o cliente.

/demonstracao/:modelo – demonstrações dos modelos.

LANDING PAGE

A landing page deve impressionar imediatamente e apresentar a Nexa como uma plataforma brasileira moderna, acessível e completa.

Não crie um layout genérico de startup com fundo roxo, gradientes exagerados e cards iguais. Utilize uma direção visual premium, com bastante personalidade, ótimo espaçamento, tipografia marcante, animações suaves e elementos interativos.

IDENTIDADE VISUAL

Utilize como base:

Fundo principal em tom claro levemente quente.

Seções estratégicas em preto ou grafite profundo.

Cor de destaque vibrante, como verde-limão sofisticado, verde elétrico ou laranja energético.

Tipografia moderna e forte nos títulos.

Textos muito legíveis.

Bordas arredondadas sem exagero.

Sombras discretas e realistas.

Ícones consistentes.

Microinterações elegantes.

Animações suaves ao rolar a página.

Excelente experiência no celular.

O design precisa transmitir tecnologia, criatividade, facilidade e confiança.

HERO DA LANDING PAGE

Criar um hero impactante com:

Título:
“Seu negócio merece mais do que apenas um link.”

Subtítulo:
“Crie uma página profissional com WhatsApp, catálogo, serviços, agendamentos, localização, redes sociais e tudo o que seus clientes precisam encontrar.”

Botões:

“Conhecer os modelos”

“Ver demonstração”

Ao lado do texto, mostrar uma composição visual interativa com três mini-sites em celulares sobrepostos. Cada celular deve representar um segmento diferente:

Restaurante.

Barbearia.

Loja de roupas.

Os celulares podem se movimentar suavemente conforme o mouse e trocar de conteúdo automaticamente. O resultado deve parecer uma apresentação real do produto, não apenas uma imagem estática.

Adicionar pequenos indicadores próximos aos celulares:

“Pedido recebido pelo WhatsApp”

“Novo agendamento”

“Cupom utilizado”

“+37 visitas hoje”

SEÇÕES DA LANDING PAGE

Faixa de credibilidade

Mostrar segmentos que podem utilizar a plataforma:

Restaurantes, lojas, barbearias, salões, transportadoras, clínicas, fotógrafos, corretores, oficinas, academias e profissionais autônomos.

Comparação visual

Criar uma seção com o título:

“Transforme um perfil comum em uma verdadeira vitrine digital.”

Mostrar uma comparação interativa:

Antes:
Uma página simples contendo apenas vários botões iguais.

Depois:
Um mini-site completo, com capa, apresentação, catálogo, serviços, promoções, avaliações, localização e contato.

Adicionar um controle que permita arrastar para comparar antes e depois.

Principais recursos

Apresentar os recursos em uma grade variada, evitando vários cards idênticos.

Recursos:

Link direto para WhatsApp.

Catálogo de produtos.

Cardápio digital.

Lista de serviços.

Botão de agendamento.

Mapa e localização.

Horários de atendimento.

Redes sociais.

Galeria de fotos.

Vídeos.

Depoimentos e avaliações.

Cupons de desconto.

Promoções temporárias.

Perguntas frequentes.

Formulário de orçamento.

Pix Copia e Cola.

QR Code automático.

Domínio personalizado.

Pixel da Meta.

Google Analytics.

Estatísticas de acessos e cliques.

Botões personalizados.

Tema claro ou escuro.

Compartilhamento rápido.

Aviso de funcionamento aberto ou fechado.

Modelos por segmento

Criar uma galeria visual rica e filtrável.

Filtros:

Todos.

Alimentação.

Beleza.

Comércio.

Serviços.

Saúde.

Eventos.

Imóveis.

Transporte.

Profissionais.

Criar pelo menos 12 modelos visualmente diferentes:

Restaurante moderno.

Hamburgueria urbana.

Loja de roupas.

Loja de cosméticos.

Barbearia premium.

Salão de beleza.

Clínica e consultório.

Personal trainer.

Fotógrafo.

Corretor de imóveis.

Transportadora.

Prestador de serviços.

Cada modelo precisa ter identidade própria. Não apenas trocar cores e manter o mesmo layout.

Ao passar o mouse, mostrar:

Visualizar modelo.

Usar este modelo.

Ao clicar em “Visualizar modelo”, abrir uma demonstração completa.

Editor visual

Criar uma seção demonstrando como o editor funciona.

Título:
“Você muda. A página responde na hora.”

Mostrar um painel de edição ao lado de uma prévia em celular. Simular alterações de cores, textos, botões e imagens acontecendo em tempo real.

Recursos específicos por segmento

Criar exemplos diferentes:

Para restaurantes:

Cardápio.

Adicionais.

Horário de funcionamento.

Pedido pelo WhatsApp.

Taxa de entrega.

Área de atendimento.

Para barbearias e salões:

Serviços.

Profissionais.

Agenda.

Portfólio.

Antes e depois.

Para lojas:

Catálogo.

Variações de produto.

Promoções.

Pix.

Pedido pelo WhatsApp.

Para transportadoras:

Solicitação de cotação.

Regiões atendidas.

Tipos de veículos.

Rastreamento como recurso futuro.

Contato comercial.

Para profissionais:

Portfólio.

Serviços.

Currículo.

Depoimentos.

Formulário de orçamento.

Estatísticas

Mostrar uma prévia elegante do painel de resultados:

Visitas no período.

Cliques no WhatsApp.

Produtos mais acessados.

Origem dos visitantes.

Horários de maior movimento.

Taxa de conversão.

Utilizar gráficos simulados bonitos e fáceis de entender.

Como funciona

Apresentar três etapas:

Escolha um modelo.

Personalize o conteúdo.

Publique e compartilhe.

Adicionar animações que conectem visualmente as etapas.

Planos demonstrativos

Criar três opções:

Essencial:
Para profissionais que precisam centralizar seus contatos.

Profissional:
Para empresas que desejam apresentar serviços, portfólio e receber solicitações.

Catálogo:
Para lojas e restaurantes que desejam divulgar produtos e receber pedidos.

Não integrar pagamento. Os botões devem abrir um modal de interesse ou direcionar para WhatsApp usando um número fictício fácil de substituir.

Destacar que os valores e recursos poderão ser alterados posteriormente.

Perguntas frequentes

Criar perguntas sobre:

Preciso ter um site?

Posso usar meu próprio domínio?

Funciona no celular?

Posso receber pedidos pelo WhatsApp?

É possível alterar o conteúdo depois?

Consigo acompanhar os acessos?

Preciso instalar algum aplicativo?

CTA final

Utilizar uma seção escura e marcante.

Título:
“Seu próximo cliente pode estar a um clique de distância.”

Texto:
“Reúna tudo o que seu negócio oferece em uma experiência bonita, rápida e fácil de compartilhar.”

Botões:

“Explorar modelos”

“Solicitar demonstração”

Rodapé completo

Incluir:

Produto.

Recursos.

Modelos.

Segmentos.

Planos.

Suporte.

Termos.

Privacidade.

Instagram.

WhatsApp.

PAINEL ADMINISTRATIVO

Criar um painel interno profissional, acessível pela rota /painel, sem exigir login.

O painel será utilizado somente pelo proprietário da plataforma.

SIDEBAR

Adicionar:

Visão geral.

Clientes.

Mini-sites.

Modelos.

Estatísticas.

Mídias.

Configurações.

Ver landing page.

Permitir recolher a sidebar.

CABEÇALHO DO PAINEL

Adicionar:

Campo de busca.

Botão “Criar novo mini-site”.

Notificações simuladas.

Alternância entre tema claro e escuro.

Perfil fictício do administrador.

VISÃO GERAL

Mostrar:

Total de clientes.

Mini-sites publicados.

Rascunhos.

Visitas no mês.

Cliques no WhatsApp.

Solicitações recebidas.

Adicionar gráfico de visitas dos últimos 30 dias e lista de atividades recentes.

CLIENTES

Criar uma tabela e opção de visualização em cards.

Cada cliente deve mostrar:

Logotipo ou avatar.

Nome da empresa.

Segmento.

Endereço do mini-site.

Status: publicado, rascunho ou pausado.

Quantidade de visitas.

Última atualização.

Ações.

Ações:

Editar.

Visualizar.

Duplicar.

Pausar.

Publicar.

Copiar endereço.

Gerar QR Code.

Excluir com confirmação.

Adicionar filtros por segmento e status.

Adicionar clientes fictícios para demonstrar a plataforma.

CRIAÇÃO DE NOVO MINI-SITE

Criar um processo em etapas:

Etapa 1 – Cliente

Nome da empresa.

Segmento.

Nome do responsável.

Telefone.

E-mail.

Cidade.

Estado.

Etapa 2 – Modelo

Escolha visual entre os modelos disponíveis.

Filtros por segmento.

Pré-visualização antes da escolha.

Etapa 3 – Conteúdo inicial

Nome da página.

Descrição.

WhatsApp.

Instagram.

Endereço.

Horário.

Logo.

Imagem de capa.

Etapa 4 – Publicação

Escolha do endereço.

Exemplo: nexa.app/nome-do-negocio

Opção de salvar como rascunho.

Opção de publicar.

Ao finalizar, criar o registro no localStorage e abrir o editor.

EDITOR VISUAL

Esta é a parte mais importante do projeto.

Criar um editor com três áreas:

Menu de edição à esquerda.

Prévia central ou à direita.

Barra superior com ações.

A prévia deve permitir alternar entre:

Celular.

Tablet.

Computador.

A prévia precisa atualizar em tempo real conforme os campos forem alterados.

MENU DO EDITOR

Informações gerais

Nome.

Categoria.

Descrição.

Logo.

Capa.

Telefone.

WhatsApp.

E-mail.

Endereço.

Localização.

Horários.

Aparência

Cores.

Fontes.

Fundo.

Bordas.

Estilo dos botões.

Tema claro ou escuro.

Imagem ou vídeo de capa.

Animações.

Espaçamento.

Escolha de layout.

Seções

Permitir ativar, desativar e reorganizar usando arrastar e soltar:

Apresentação.

Links.

Produtos.

Serviços.

Cardápio.

Galeria.

Vídeos.

Depoimentos.

Equipe.

Promoção.

Cupom.

Localização.

Horários.

Perguntas frequentes.

Formulário.

Rodapé.

Links

Permitir cadastrar diferentes tipos:

WhatsApp.

Instagram.

Facebook.

TikTok.

YouTube.

Site.

Telefone.

E-mail.

Localização.

Link personalizado.

Cada link deve permitir:

Escolher ícone.

Alterar título.

Alterar cor.

Reorganizar.

Desativar.

Excluir.

Produtos e catálogo

Permitir adicionar produtos com:

Foto.

Nome.

Descrição.

Preço normal.

Preço promocional.

Categoria.

Variações.

Disponibilidade.

Produto em destaque.

Botão “Pedir pelo WhatsApp”.

Criar busca e filtros no catálogo público.

Ao clicar em pedir, montar automaticamente uma mensagem de WhatsApp como:

“Olá! Tenho interesse no produto [nome do produto], no valor de [preço].”

Serviços

Permitir adicionar:

Nome.

Descrição.

Duração.

Preço.

Profissional responsável.

Imagem.

Botão para agendar.

Galeria

Upload simulado.

Visualização em grade.

Reorganização.

Exclusão.

Modal para ampliar fotos.

Avaliações

Nome do cliente.

Foto.

Nota.

Comentário.

Data.

Destaque.

Promoções e cupons

Título.

Descrição.

Código.

Data de validade.

Contagem regressiva.

Botão de utilização.

Formulários

Criar formulário configurável para:

Orçamento.

Contato.

Reserva.

Agendamento.

Cotação.

Os envios podem ser simulados e armazenados no localStorage.

SEO e compartilhamento

Título da página.

Descrição.

Imagem de compartilhamento.

Palavras-chave.

Slug.

Prévia de como o link aparece no WhatsApp.

Integrações futuras

Criar campos visuais para:

Google Analytics.

Pixel da Meta.

Domínio personalizado.

Google Maps.

API do WhatsApp.

Mostrar esses itens como opcionais ou “em breve”, sem realizar integrações reais.

BARRA SUPERIOR DO EDITOR

Adicionar:

Voltar ao painel.

Status de salvamento.

Desfazer.

Refazer.

Pré-visualizar.

Compartilhar.

Publicar.

Menu de opções.

Salvar automaticamente no localStorage e mostrar mensagens como:

“Salvando…”

“Alterações salvas”

“Página publicada”

MINI-SITES PÚBLICOS

Cada modelo precisa parecer um site real, rápido e feito especialmente para aquele segmento.

Os mini-sites devem possuir:

Design mobile-first.

Carregamento visual rápido.

Botão flutuante de WhatsApp.

Cabeçalho personalizado.

Imagem de capa.

Informações principais.

Seções configuráveis.

Compartilhamento.

QR Code.

Rodapé discreto com “Criado com Nexa”.

Navegação suave.

Animações leves.

Boa acessibilidade.

Contraste adequado.

Botões grandes e fáceis de tocar.

Não transformar todos os modelos em uma lista vertical de botões. Criar experiências variadas:

Modelo editorial.

Modelo em cards.

Modelo semelhante a catálogo.

Modelo imersivo com imagens grandes.

Modelo elegante e minimalista.

Modelo urbano e ousado.

Modelo corporativo.

Modelo colorido e descontraído.

FUNCIONALIDADES EXTRAS

Adicionar:

Geração automática de QR Code.

Copiar link com confirmação visual.

Compartilhamento pelo WhatsApp.

Modo de pré-visualização.

Busca de clientes.

Duplicação de mini-site.

Biblioteca de imagens simulada.

Sistema de notificações.

Autosave.

Undo e redo.

Toasts elegantes.

Modais bem desenhados.

Estados vazios explicativos.

Skeleton loading.

Confirmação antes de excluir.

Mensagens de sucesso e erro.

Tour inicial opcional pelo painel.

Dados de demonstração.

Tema claro e escuro no painel.

REQUISITOS TÉCNICOS

Utilizar React com TypeScript.

Utilizar Tailwind CSS.

Utilizar componentes reutilizáveis.

Utilizar Lucide Icons.

Utilizar React Router.

Utilizar Recharts nos gráficos.

Utilizar uma biblioteca adequada para drag and drop.

Usar localStorage para persistência temporária.

Criar tipos bem definidos para clientes, páginas, seções, produtos e configurações.

Separar os dados simulados da interface.

Manter código organizado.

Criar componentes pequenos e reutilizáveis.

Não criar arquivos gigantes desnecessários.

Garantir funcionamento responsivo.

Garantir que nenhuma tela tenha rolagem horizontal indevida.

Criar estados de hover, focus, active e disabled.

Preparar a estrutura para integração futura com Supabase.

Não instalar dependências desnecessárias.

Não utilizar imagens quebradas.

Utilizar imagens profissionais e coerentes com cada segmento.

Garantir que as alterações do editor apareçam na prévia imediatamente.

QUALIDADE VISUAL

O resultado não pode parecer:

Template genérico.

Projeto escolar.

Página simples de “link na bio”.

Dashboard criado automaticamente sem personalidade.

Coleção repetitiva de cards.

Landing page roxa genérica de inteligência artificial.

Site com excesso de gradientes.

Protótipo vazio com textos genéricos.

Site infantil ou visualmente poluído.

O resultado deve parecer:

Produto tecnológico brasileiro premium.

Plataforma pronta para ser apresentada a clientes.

Ferramenta simples de usar, mas visualmente sofisticada.

Sistema que poderia futuramente se tornar um SaaS.

Experiência comparável a produtos digitais profissionais.

Aplicação feita por uma equipe de design e desenvolvimento experiente.

TEXTOS

Todo o conteúdo da interface deve estar em português do Brasil.

Não utilizar Lorem Ipsum.

Criar textos reais, naturais e comerciais.

Utilizar valores em reais.

Utilizar exemplos de empresas brasileiras fictícias.

Utilizar números de telefone fictícios.

Utilizar cidades e estados brasileiros nos dados simulados.

ENTREGA

Comece construindo a estrutura completa da aplicação e implemente primeiro:

Landing page premium.

Painel administrativo.

Cadastro de cliente.

Galeria de modelos.

Editor visual com prévia em tempo real.

Mini-sites demonstrativos.

Persistência usando localStorage.

Interações, responsividade e acabamento visual.

Não simplifique a proposta para entregar apenas uma landing page.

Não deixe seções importantes apenas como textos explicando o que deveria existir. Implemente visualmente as telas, interações e demonstrações.

Se alguma parte for extensa, construa progressivamente, preservando a arquitetura e o padrão visual definidos acima.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e75103a9-158c-4a55-8aa6-ffeb8c3ad10b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
