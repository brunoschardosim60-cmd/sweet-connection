import { modelos } from "./modelos";
import { ESTILOS_IA, type EstiloIA, type PlanoIA, type TemaIA } from "./ia-tipos";

export interface EntradaPlano {
  empresa: string;
  nicho: string;
  cidade?: string;
  estado?: string;
  /** URLs públicas das imagens enviadas (usadas como referência visual). */
  imagens?: string[];
  /** Estilo visual pedido pela pessoa. */
  estilo?: EstiloIA;
  /** Tema pedido pela pessoa (claro/escuro). */
  tema?: TemaIA;
}

const MODELO = "google/gemini-2.5-flash";

const listaModelos = () => modelos.map((m) => `${m.id} (${m.segmento})`).join(", ");

function extrairJson(texto: string): PlanoIA {
  const limpo = texto
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const inicio = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (inicio < 0 || fim < 0) throw new Error("A IA não devolveu um plano válido.");
  return JSON.parse(limpo.slice(inicio, fim + 1)) as PlanoIA;
}

/** Gera o plano de conteúdo do mini-site a partir da descrição do negócio. */
export async function gerarPlano(entrada: EntradaPlano): Promise<PlanoIA> {
  const chave = process.env["LOVABLE_API_KEY"];
  if (!chave) throw new Error("Serviço de IA indisponível: chave não configurada.");

  const conteudo: unknown[] = [
    {
      type: "text",
      text: [
        `Negócio: ${entrada.empresa}`,
        `Descrição/nicho informado: ${entrada.nicho}`,
        entrada.cidade ? `Cidade: ${entrada.cidade} - ${entrada.estado ?? ""}` : "",
        entrada.estilo && entrada.estilo !== "automatico"
          ? `Estilo visual desejado: ${ESTILOS_IA[entrada.estilo].rotulo} (${ESTILOS_IA[entrada.estilo].descricao}).`
          : "",
        entrada.tema && entrada.tema !== "automatico"
          ? `Tema obrigatório: ${entrada.tema}. Escolha cores com bom contraste para esse tema.`
          : "",
        "Gere o plano do mini-site em português do Brasil.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    ...(entrada.imagens ?? [])
      .slice(0, 4)
      .map((url) => ({ type: "image_url", image_url: { url } })),
  ];

  const resposta = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELO,
      messages: [
        {
          role: "system",
          content: [
            "Você monta mini-sites para pequenos negócios brasileiros.",
            "Responda SOMENTE com JSON válido, sem comentários nem markdown.",
            "Formato:",
            '{"descricao":string(1-2 frases),"segmento":"alimentacao|beleza|comercio|servicos|saude|eventos|imoveis|transporte|profissionais",',
            `"modeloId": um destes ids: ${listaModelos()},`,
            '"cores":{"primaria":"#RRGGBB","fundo":"#RRGGBB","texto":"#RRGGBB"},"tema":"claro|escuro",',
            '"secoes":["apresentacao","links","produtos","servicos","cardapio","galeria","depoimentos","equipe","promocao","cupom","localizacao","horarios","faq","formulario","rodape"],',
            '"servicos":[{"nome":string,"descricao":string,"duracao":string,"preco":number}],',
            '"produtos":[{"nome":string,"descricao":string,"preco":number,"categoria":string}],',
            '"faq":[{"pergunta":string,"resposta":string}],',
            '"depoimentos":[{"nome":string,"nota":number,"comentario":string}],',
            '"galeria":[{"titulo":string}],',
            '"formulario":{"tipo":"orcamento|contato|reserva|agendamento|cotacao","titulo":string},',
            '"seo":{"titulo":string,"descricao":string,"palavras":string}}',
            "Use as imagens enviadas como referência do estilo e do que o negócio vende.",
            "Preços realistas em reais; no máximo 6 itens por lista.",
          ].join(" "),
        },
        { role: "user", content: conteudo },
      ],
    }),
  });

  if (!resposta.ok) {
    if (resposta.status === 429)
      throw new Error("Muitas gerações seguidas. Tente novamente em instantes.");
    if (resposta.status === 402) throw new Error("Créditos de IA esgotados no workspace.");
    throw new Error(`Falha na geração (${resposta.status}).`);
  }

  const json = (await resposta.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const texto = json.choices?.[0]?.message?.content;
  if (!texto) throw new Error("A IA não devolveu conteúdo.");
  return extrairJson(texto);
}
