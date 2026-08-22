import { ESTILOS_IA, type EstiloIA, type PlanoIA, type TemaIA } from "./ia-tipos";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface EntradaPlano {
  empresa: string;
  nicho: string;
  cidade?: string;
  estado?: string;
  /** URL pública da logo; a IA usa somente como referência de identidade visual. */
  logo?: string;
  /** Imagem escolhida como capa do mini-site. */
  capa?: string;
  /** URLs públicas das imagens enviadas (usadas como referência visual). */
  imagens?: string[];
  /** Estilo visual pedido pela pessoa. */
  estilo?: EstiloIA;
  /** Tema pedido pela pessoa (claro/escuro). */
  tema?: TemaIA;
}

const MODELO_LOVABLE = "google/gemini-2.5-flash";
const MODELO_GEMINI_PADRAO = "gemini-2.5-flash";
// Logo + capa + uma foto contextual bastam para direção de arte; as outras
// imagens continuam no mini-site, mas não encarecem a análise multimodal.
const MAX_IMAGENS_REFERENCIA = 3;
const MAX_BYTES_POR_IMAGEM = 3 * 1024 * 1024;
const LIMITE_SAIDA_TOKENS = 2_200;
const ORCAMENTO_PENSAMENTO_TOKENS = 1_024;

type UsoTokens = { prompt: number; completion: number; total: number };
type RespostaGeracao = { plano: PlanoIA; uso: UsoTokens };

function numeroNaoNegativo(valor: unknown) {
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : 0;
}

function custoEstimadoGemini(uso: UsoTokens) {
  // A franquia gratuita continua em R$ 0. Caso a conta passe a usar tarifa paga,
  // os valores por milhão de tokens podem ser configurados na Vercel sem expor chave.
  const entrada = Number(process.env["GEMINI_INPUT_COST_BRL_PER_MILLION"] ?? 0);
  const saida = Number(process.env["GEMINI_OUTPUT_COST_BRL_PER_MILLION"] ?? 0);
  return Math.max(0, (uso.prompt * entrada + uso.completion * saida) / 1_000_000);
}

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

function instrucoesDoPlano(entrada: EntradaPlano) {
  const cardapio =
    /restaurante|hamburg|pizza|pizzaria|lanch|bar\b|cafe|cafeter|doceria|confeitaria|delivery|comida|alimenta/i.test(
      entrada.nicho,
    );
  return [
    "Você é diretora de arte e estrategista de marca para pequenos negócios brasileiros.",
    "Crie uma primeira versão elegante, contemporânea e específica. Evite clichês, excessos e texto genérico.",
    "Use logo e fotos como direção de arte: extraia o clima, contraste e cores predominantes; não redesenhe logo nem invente imagens.",
    "Defina paleta com uma cor principal, fundo e texto com contraste legível. Priorize hierarquia: capa forte, CTA claro, seções curtas e ritmo visual coerente.",
    "Responda SOMENTE JSON válido, sem markdown. Seja concisa: descrição até 28 palavras, até 6 produtos/serviços, até 4 FAQs e até 7 seções relevantes.",
    "Nunca invente preço, endereço, horário, certificação, promoção, depoimento ou avaliação. Se não houver dado, omita o campo/seção.",
    cardapio
      ? "Este é um negócio de alimentação: ative cardapio e produtos; devolva itens com categorias úteis (ex.: Burgers, Pizzas, Bebidas), sem preço se não informado. A experiência deve parecer um cardápio digital, não uma página institucional genérica."
      : "Escolha seções e CTA adequados ao segmento; produtos e serviços devem ter nomes concretos e descrições úteis.",
    "Formato JSON:",
    '{"descricao":string(1-2 frases),"segmento":"alimentacao|beleza|comercio|servicos|saude|eventos|imoveis|transporte|profissionais",',
    '"cores":{"primaria":"#RRGGBB","fundo":"#RRGGBB","texto":"#RRGGBB"},"tema":"claro|escuro",',
    '"secoes":["apresentacao","links","produtos","servicos","cardapio","galeria","depoimentos","equipe","promocao","cupom","localizacao","horarios","faq","formulario","rodape"],',
    '"servicos":[{"nome":string,"descricao":string,"duracao":string,"preco":number}],',
    '"produtos":[{"nome":string,"descricao":string,"preco":number,"categoria":string}],',
    '"faq":[{"pergunta":string,"resposta":string}],',
    '"galeria":[{"titulo":string}],',
    '"formulario":{"tipo":"orcamento|contato|reserva|agendamento|cotacao","titulo":string},',
    '"seo":{"titulo":string,"descricao":string,"palavras":string}}',
  ].join(" ");
}

function briefingEmTexto(entrada: EntradaPlano) {
  return [
    `Negócio: ${entrada.empresa}`,
    `Descrição/nicho informado: ${entrada.nicho}`,
    entrada.cidade ? `Cidade: ${entrada.cidade} - ${entrada.estado ?? ""}` : "",
    entrada.logo ? "A primeira imagem é a logo da marca." : "",
    entrada.capa ? "A segunda imagem é a capa preferida do mini-site." : "",
    "As imagens restantes são referências de produtos, equipe ou ambiente.",
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
  return [entrada.logo, entrada.capa, ...(entrada.imagens ?? [])]
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

async function gerarComGeminiDireto(
  chave: string,
  entrada: EntradaPlano,
): Promise<RespostaGeracao> {
  const modelo = process.env["GEMINI_MODEL"] ?? MODELO_GEMINI_PADRAO;
  const resposta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": chave, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instrucoesDoPlano(entrada) }] },
        contents: [
          {
            role: "user",
            parts: [{ text: briefingEmTexto(entrada) }, ...(await partesDeImagemGemini(entrada))],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.35,
          maxOutputTokens: LIMITE_SAIDA_TOKENS,
          thinkingConfig: { thinkingBudget: ORCAMENTO_PENSAMENTO_TOKENS },
        },
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
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  };
  const texto = json.candidates?.[0]?.content?.parts?.map((parte) => parte.text ?? "").join("");
  if (!texto) throw new Error("O Gemini não devolveu conteúdo.");
  const prompt = numeroNaoNegativo(json.usageMetadata?.promptTokenCount);
  const completion = numeroNaoNegativo(json.usageMetadata?.candidatesTokenCount);
  return {
    plano: extrairJson(texto),
    uso: {
      prompt,
      completion,
      total: numeroNaoNegativo(json.usageMetadata?.totalTokenCount) || prompt + completion,
    },
  };
}

/** Gera o plano de conteúdo do mini-site a partir da descrição do negócio. */
async function reservarGeracao(accessToken: string) {
  const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
  if (authError || !auth.user)
    throw new Error("Sua sessão expirou. Entre novamente para usar a IA.");

  const { data, error } = await supabaseAdmin.rpc("nexa_consume_ai_generation", {
    requested_user_id: auth.user.id,
  });
  if (error) throw new Error("Não foi possível verificar seu limite de IA.");

  const resultado = Array.isArray(data) ? data[0] : data;
  if (!resultado?.allowed) {
    throw new Error(
      "Você já utilizou a geração com IA incluída no seu plano nesta semana. Uma nova geração ficará disponível na próxima semana.",
    );
  }
  return auth.user.id;
}

async function devolverGeracao(ownerId: string) {
  await supabaseAdmin.rpc("nexa_refund_ai_generation", { requested_user_id: ownerId });
}

async function registrarUso(
  ownerId: string,
  provider: "gemini" | "lovable",
  modelo: string,
  uso: UsoTokens,
) {
  // Métrica de custo nunca interfere na geração entregue ao cliente.
  try {
    await supabaseAdmin.rpc("nexa_record_ai_generation", {
      requested_user_id: ownerId,
      requested_provider: provider,
      requested_model: modelo,
      requested_prompt_tokens: uso.prompt,
      requested_completion_tokens: uso.completion,
      requested_total_tokens: uso.total,
      requested_estimated_cost_brl: provider === "gemini" ? custoEstimadoGemini(uso) : 0,
    });
  } catch {
    // A geração continua válida mesmo se a telemetria temporariamente falhar.
  }
}

/** Gera um plano somente para uma sessão Supabase autenticada e com saldo diário. */
export async function gerarPlano(entrada: EntradaPlano, accessToken: string): Promise<PlanoIA> {
  const ownerId = await reservarGeracao(accessToken);
  try {
    const chaveGemini = process.env["GEMINI_API_KEY"];
    if (chaveGemini) {
      const geracao = await gerarComGeminiDireto(chaveGemini, entrada);
      await registrarUso(
        ownerId,
        "gemini",
        process.env["GEMINI_MODEL"] ?? MODELO_GEMINI_PADRAO,
        geracao.uso,
      );
      return geracao.plano;
    }

    const chave = process.env["LOVABLE_API_KEY"];
    if (!chave)
      throw new Error("A criação com IA está indisponível no momento. Tente novamente mais tarde.");

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
            content: instrucoesDoPlano(entrada),
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
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const texto = json.choices?.[0]?.message?.content;
    if (!texto) throw new Error("A IA não devolveu conteúdo.");
    const prompt = numeroNaoNegativo(json.usage?.prompt_tokens);
    const completion = numeroNaoNegativo(json.usage?.completion_tokens);
    await registrarUso(ownerId, "lovable", MODELO_LOVABLE, {
      prompt,
      completion,
      total: numeroNaoNegativo(json.usage?.total_tokens) || prompt + completion,
    });
    return extrairJson(texto);
  } catch (error) {
    await devolverGeracao(ownerId);
    throw error;
  }
}
