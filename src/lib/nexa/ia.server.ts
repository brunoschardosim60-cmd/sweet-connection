import { ESTILOS_IA, type EstiloIA, type PlanoIA, type TemaIA } from "./ia-tipos";

export interface EntradaPlano {
  empresa: string;
  nicho: string;
  cidade?: string;
  estado?: string;
  /** URL pública da logo; a IA usa somente como referência de identidade visual. */
  logo?: string;
  /** URLs públicas das imagens enviadas (usadas como referência visual). */
  imagens?: string[];
  /** Estilo visual pedido pela pessoa. */
  estilo?: EstiloIA;
  /** Tema pedido pela pessoa (claro/escuro). */
  tema?: TemaIA;
}

const MODELO_LOVABLE = "google/gemini-2.5-flash";
const MODELO_GEMINI_PADRAO = "gemini-2.5-flash";
const MAX_IMAGENS_REFERENCIA = 4;
const MAX_BYTES_POR_IMAGEM = 3 * 1024 * 1024;

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

function instrucoesDoPlano() {
  return [
    "Você é uma especialista brasileira sênior em estratégia de marca, UX para pequenos negócios, copywriting de conversão e SEO local.",
    "Monte um mini-site profissional, específico e útil para o negócio informado; evite frases genéricas e clichês.",
    "Responda SOMENTE com JSON válido, sem comentários nem markdown.",
    "Formato:",
    '{"descricao":string(1-2 frases),"segmento":"alimentacao|beleza|comercio|servicos|saude|eventos|imoveis|transporte|profissionais",',
    '"cores":{"primaria":"#RRGGBB","fundo":"#RRGGBB","texto":"#RRGGBB"},"tema":"claro|escuro",',
    '"secoes":["apresentacao","links","produtos","servicos","cardapio","galeria","depoimentos","equipe","promocao","cupom","localizacao","horarios","faq","formulario","rodape"],',
    '"servicos":[{"nome":string,"descricao":string,"duracao":string,"preco":number}],',
    '"produtos":[{"nome":string,"descricao":string,"preco":number,"categoria":string}],',
    '"faq":[{"pergunta":string,"resposta":string}],',
    '"depoimentos":[{"nome":string,"nota":number,"comentario":string}],',
    '"galeria":[{"titulo":string}],',
    '"formulario":{"tipo":"orcamento|contato|reserva|agendamento|cotacao","titulo":string},',
    '"seo":{"titulo":string,"descricao":string,"palavras":string}}',
    "Não escolha nem reutilize um modelo pronto: monte o conteúdo e as seções do zero a partir do briefing.",
    "A logo é uma referência visual: use suas cores, clima e nível de sofisticação para a paleta, sem tentar redesenhá-la nem inventar uma marca diferente.",
    "Crie uma apresentação objetiva e persuasiva, 4 a 6 serviços ou produtos quando fizer sentido, uma FAQ realmente útil, CTA compatível com o segmento e SEO local natural.",
    "Cada item deve ter nome específico e uma descrição concreta de 1 ou 2 frases; prefira qualidade e coerência a quantidade.",
    "Para alimentação, priorize cardápio, pedido/reserva e categorias coerentes; para beleza, serviços, duração e agendamento; para saúde, contato/agendamento sem promessas clínicas; para eventos, pacotes sob orçamento; para imóveis, captação/visita sem imóveis fictícios; para transporte, rotas/cotação; para advocacia, atendimento e áreas sem promessa de resultado.",
    "Use as imagens enviadas como referência do estilo e do que o negócio vende. Só inclua galeria quando houver fotos para ela.",
    "Nunca invente preços, horários, endereço, certificações, promoções ou depoimentos. Se essas informações não existirem no briefing, omita o campo ou a seção.",
    "Não crie depoimentos fictícios. Gere no máximo 6 itens por lista.",
  ].join(" ");
}

function briefingEmTexto(entrada: EntradaPlano) {
  return [
    `Negócio: ${entrada.empresa}`,
    `Descrição/nicho informado: ${entrada.nicho}`,
    entrada.cidade ? `Cidade: ${entrada.cidade} - ${entrada.estado ?? ""}` : "",
    entrada.logo ? "A primeira imagem é a logo da marca; as demais são fotos do negócio." : "",
    entrada.estilo && entrada.estilo !== "automatico"
      ? `Estilo visual desejado: ${ESTILOS_IA[entrada.estilo].rotulo} (${ESTILOS_IA[entrada.estilo].descricao}).`
      : "",
    entrada.tema && entrada.tema !== "automatico"
      ? `Tema obrigatório: ${entrada.tema}. Escolha cores com bom contraste para esse tema.`
      : "",
    "Gere o plano do mini-site em português do Brasil.",
  ]
    .filter(Boolean)
    .join("\n");
}

function urlsDeReferencia(entrada: EntradaPlano) {
  return [entrada.logo, ...(entrada.imagens ?? [])]
    .filter(Boolean)
    .slice(0, MAX_IMAGENS_REFERENCIA) as string[];
}

function urlDeStorageConfiavel(url: string) {
  try {
    const origemSupabase = process.env["VITE_SUPABASE_URL"];
    if (!origemSupabase) return false;
    const origem = new URL(origemSupabase).origin;
    const imagem = new URL(url);
    return imagem.origin === origem && imagem.pathname.includes("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

async function partesDeImagemGemini(entrada: EntradaPlano) {
  const urls = urlsDeReferencia(entrada).filter(urlDeStorageConfiavel);
  const partes: { inlineData: { mimeType: string; data: string } }[] = [];
  for (const url of urls) {
    try {
      const resposta = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      const mimeType = resposta.headers.get("content-type")?.split(";")[0] ?? "";
      if (!resposta.ok || !mimeType.startsWith("image/")) continue;
      const bytes = new Uint8Array(await resposta.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES_POR_IMAGEM) continue;
      let binario = "";
      for (const byte of bytes) binario += String.fromCharCode(byte);
      partes.push({ inlineData: { mimeType, data: btoa(binario) } });
    } catch {
      // Uma foto indisponível não deve impedir a geração do mini-site.
    }
  }
  return partes;
}

async function gerarComGeminiDireto(chave: string, entrada: EntradaPlano): Promise<PlanoIA> {
  const modelo = process.env["GEMINI_MODEL"] ?? MODELO_GEMINI_PADRAO;
  const resposta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": chave, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instrucoesDoPlano() }] },
        contents: [
          {
            role: "user",
            parts: [{ text: briefingEmTexto(entrada) }, ...(await partesDeImagemGemini(entrada))],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0.45 },
      }),
    },
  );

  if (!resposta.ok) {
    if (resposta.status === 429)
      throw new Error("Limite temporário do Gemini. Tente novamente em instantes.");
    throw new Error(`Falha no Gemini (${resposta.status}).`);
  }
  const json = (await resposta.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const texto = json.candidates?.[0]?.content?.parts?.map((parte) => parte.text ?? "").join("");
  if (!texto) throw new Error("O Gemini não devolveu conteúdo.");
  return extrairJson(texto);
}

/** Gera o plano de conteúdo do mini-site a partir da descrição do negócio. */
export async function gerarPlano(entrada: EntradaPlano): Promise<PlanoIA> {
  const chaveGemini = process.env["GEMINI_API_KEY"];
  if (chaveGemini) return gerarComGeminiDireto(chaveGemini, entrada);

  const chave = process.env["LOVABLE_API_KEY"];
  if (!chave) throw new Error("Serviço de IA indisponível: configure GEMINI_API_KEY na Vercel.");

  const conteudo: unknown[] = [
    { type: "text", text: briefingEmTexto(entrada) },
    ...urlsDeReferencia(entrada).map((url) => ({ type: "image_url", image_url: { url } })),
  ];

  const resposta = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELO_LOVABLE,
      messages: [
        {
          role: "system",
          content: instrucoesDoPlano(),
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
