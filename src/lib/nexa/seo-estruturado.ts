import { enderecoSite, origemPublica, urlPublica } from "./clipboard";
import { brand } from "./brand";
import type { HorarioDia, Site } from "./types";

type JsonLd = Record<string, unknown>;

const diasSchema: Record<string, string> = {
  segunda: "Monday",
  terça: "Tuesday",
  terca: "Tuesday",
  quarta: "Wednesday",
  quinta: "Thursday",
  sexta: "Friday",
  sábado: "Saturday",
  sabado: "Saturday",
  domingo: "Sunday",
};

function tipoDoNegocio(site: Site) {
  if (site.cliente.segmento === "alimentacao") return "Restaurant";
  if (site.cliente.segmento === "beleza") return "BarberShop";
  if (site.cliente.segmento === "saude") return "MedicalBusiness";
  if (site.cliente.segmento === "imoveis") return "RealEstateAgent";
  return "LocalBusiness";
}

function horariosEstruturados(horarios: HorarioDia[]) {
  return horarios.flatMap((horario) => {
    const dia = diasSchema[horario.dia.trim().toLowerCase()];
    if (!dia || horario.fechado || !horario.abre || !horario.fecha) return [];
    return [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${dia}`,
        opens: horario.abre,
        closes: horario.fecha,
      },
    ];
  });
}

function urlInstagram(valor: string) {
  const limpo = valor.trim().replace(/^@/, "");
  if (!limpo) return undefined;
  return /^https?:\/\//i.test(limpo) ? limpo : `https://www.instagram.com/${limpo}`;
}

/** Dados estruturados públicos. Não inclui rascunhos, dados pessoais ou informação de pagamento. */
export function dadosEstruturadosDoSite(site: Site, opcoes?: { cardapio?: boolean }): JsonLd {
  const urlSite = enderecoSite(site.slug);
  const urlPagina = opcoes?.cardapio ? `${urlSite}/cardapio` : urlSite;
  const idNegocio = `${urlSite}#negocio`;
  const imagem = urlPublica(site.seo.imagem || site.conteudo.capa);
  const produtos = site.produtos.filter((produto) => produto.disponivel).slice(0, 40);
  const negocio: JsonLd = {
    "@type": tipoDoNegocio(site),
    "@id": idNegocio,
    name: site.conteudo.nome,
    description: site.seo.descricao || site.conteudo.descricao,
    url: urlSite,
    ...(imagem ? { image: imagem } : {}),
    ...(site.conteudo.logo ? { logo: site.conteudo.logo } : {}),
    ...(site.conteudo.telefone ? { telephone: site.conteudo.telefone } : {}),
    ...(site.conteudo.email ? { email: site.conteudo.email } : {}),
    ...(site.conteudo.endereco || site.cliente.cidade
      ? {
          address: {
            "@type": "PostalAddress",
            ...(site.conteudo.endereco ? { streetAddress: site.conteudo.endereco } : {}),
            addressLocality: site.cliente.cidade,
            addressRegion: site.cliente.estado,
            addressCountry: "BR",
          },
        }
      : {}),
    ...(horariosEstruturados(site.conteudo.horarios).length
      ? { openingHoursSpecification: horariosEstruturados(site.conteudo.horarios) }
      : {}),
    ...(urlInstagram(site.conteudo.instagram)
      ? { sameAs: [urlInstagram(site.conteudo.instagram)] }
      : {}),
    ...(site.comercio && produtos.length ? { hasMenu: `${urlSite}/cardapio#menu` } : {}),
  };

  const grafo: JsonLd[] = [
    {
      "@type": "WebSite",
      "@id": `${urlSite}#website`,
      url: urlSite,
      name: site.conteudo.nome,
      inLanguage: "pt-BR",
      publisher: { "@id": idNegocio },
    },
    negocio,
    {
      "@type": "WebPage",
      "@id": `${urlPagina}#pagina`,
      url: urlPagina,
      name: opcoes?.cardapio
        ? `Cardápio — ${site.conteudo.nome}`
        : site.seo.titulo || site.conteudo.nome,
      description: site.seo.descricao || site.conteudo.descricao,
      inLanguage: "pt-BR",
      isPartOf: { "@id": `${urlSite}#website` },
      about: { "@id": idNegocio },
      ...(imagem ? { primaryImageOfPage: imagem } : {}),
    },
  ];

  if (produtos.length) {
    grafo.push({
      "@type": "Menu",
      "@id": `${urlSite}/cardapio#menu`,
      name: `Cardápio de ${site.conteudo.nome}`,
      url: `${urlSite}/cardapio`,
      hasMenuItem: produtos.map((produto) => ({
        "@type": "MenuItem",
        name: produto.nome,
        description: produto.descricao,
        ...(produto.imagem ? { image: urlPublica(produto.imagem) } : {}),
        offers: {
          "@type": "Offer",
          priceCurrency: "BRL",
          price: produto.precoPromocional ?? produto.preco,
          availability: "https://schema.org/InStock",
        },
      })),
    });
    produtos.forEach((produto) => {
      grafo.push({
        "@type": "Product",
        "@id": `${urlSite}/cardapio#${encodeURIComponent(produto.id)}`,
        name: produto.nome,
        description: produto.descricao,
        ...(produto.imagem ? { image: urlPublica(produto.imagem) } : {}),
        category: produto.categoria,
        brand: { "@id": idNegocio },
        offers: {
          "@type": "Offer",
          priceCurrency: "BRL",
          price: produto.precoPromocional ?? produto.preco,
          availability: "https://schema.org/InStock",
          url: `${urlSite}/cardapio`,
        },
      });
    });
  }

  if (site.servicos.length) {
    grafo.push({
      "@type": "ItemList",
      name: `Serviços de ${site.conteudo.nome}`,
      itemListElement: site.servicos.slice(0, 30).map((servico, posicao) => ({
        "@type": "ListItem",
        position: posicao + 1,
        item: {
          "@type": "Service",
          name: servico.nome,
          description: servico.descricao,
          ...(servico.imagem ? { image: urlPublica(servico.imagem) } : {}),
          provider: { "@id": idNegocio },
          ...(servico.preco > 0
            ? { offers: { "@type": "Offer", priceCurrency: "BRL", price: servico.preco } }
            : {}),
        },
      })),
    });
  }

  if (site.faq.length) {
    grafo.push({
      "@type": "FAQPage",
      mainEntity: site.faq.slice(0, 20).map((item) => ({
        "@type": "Question",
        name: item.pergunta,
        acceptedAnswer: { "@type": "Answer", text: item.resposta },
      })),
    });
  }

  site.videos?.slice(0, 10).forEach((video) => {
    if (!/^https?:\/\//i.test(video.url)) return;
    grafo.push({
      "@type": "VideoObject",
      name: video.titulo,
      description: video.descricao || site.conteudo.descricao || video.titulo,
      contentUrl: video.url,
      uploadDate: site.atualizadoEm,
    });
  });

  return { "@context": "https://schema.org", "@graph": grafo };
}

/** Evita que conteúdo inserido pelo usuário feche a tag script de JSON-LD. */
export function serializarJsonLd(dados: JsonLd) {
  return JSON.stringify(dados).replace(/</g, "\\u003c");
}

/** Dados estruturados da própria Nexa, separados dos dados de cada cliente. */
export function dadosEstruturadosDaNexa(): JsonLd {
  // Usa o domínio efetivamente configurado para não anunciar um endereço
  // diferente do que está publicado durante a fase de testes ou após migração.
  const url = origemPublica();
  const organizacaoId = `${url}/#organizacao`;
  const planos = [
    { nome: "Essencial", preco: 39, url: `${url}/#planos` },
    { nome: "Profissional", preco: 79, url: `${url}/#planos` },
    { nome: "Catálogo", preco: 119, url: `${url}/#planos` },
  ];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizacaoId,
        name: brand.nome,
        url,
        email: brand.emailContato,
        sameAs: [`https://www.instagram.com/${brand.instagram}`],
      },
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        url,
        name: brand.nome,
        description: brand.slogan,
        inLanguage: "pt-BR",
        publisher: { "@id": organizacaoId },
      },
      {
        "@type": "SoftwareApplication",
        name: "Nexa",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url,
        description:
          "Plataforma brasileira para criar mini-sites profissionais, cardápios digitais, catálogos, formulários e agendamentos.",
        provider: { "@id": organizacaoId },
        offers: planos.map((plano) => ({
          "@type": "Offer",
          name: `Nexa ${plano.nome}`,
          price: plano.preco,
          priceCurrency: "BRL",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: plano.preco,
            priceCurrency: "BRL",
            billingDuration: "P1M",
          },
          url: plano.url,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Preciso instalar algum aplicativo?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Não. A Nexa funciona pelo navegador no computador ou celular.",
            },
          },
          {
            "@type": "Question",
            name: "Posso criar um cardápio digital?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Sim. A Nexa possui modelos de cardápio digital com produtos, carrinho e pedidos para o estabelecimento.",
            },
          },
        ],
      },
    ],
  };
}
