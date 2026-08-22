import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { PhoneFrame } from "@/components/PhoneFrame";
import { CriacaoIA } from "@/components/painel/CriacaoIA";
import { MiniSite } from "@/components/minisite/MiniSite";
import { useNexa } from "@/lib/nexa/hooks";
import { criarSite } from "@/lib/nexa/factory";
import { modeloPersonalizado, modelos, modelosCriacao } from "@/lib/nexa/modelos";
import { modelosUsuarioStore } from "@/lib/nexa/modelos-usuario";
import { estados, segmentos } from "@/lib/nexa/segmentos";
import { slugify, telefoneMask } from "@/lib/nexa/utils";
import { importarDadosPublicos } from "@/lib/nexa/importar-dados";
import { supabase } from "@/integrations/supabase/client";
import type { Cliente, SegmentoId, Site } from "@/lib/nexa/types";

interface NovoBusca {
  empresa?: string;
  whatsapp?: string;
  email?: string;
  cidade?: string;
  estado?: string;
  endereco?: string;
  cor?: string;
  logo?: string;
  nicho?: string;
  /** ID direto de modelo (passado por outras rotas via search={{ modelo: m.id }}). */
  modelo?: string;
  /** Abre o assistente de criação automática depois do cadastro do cliente. */
  modo?: "ia";
}

export const Route = createFileRoute("/painel/novo")({
  validateSearch: (search: Record<string, unknown>): NovoBusca => {
    const str = (v: unknown): string | undefined =>
      typeof v === "string" && v.length > 0 ? v : undefined;
    return {
      empresa: str(search["empresa"]) ?? str(search["name"]) ?? str(search["nome"]),
      whatsapp: str(search["whatsapp"]) ?? str(search["phone"]) ?? str(search["telefone"]),
      email: str(search["email"]),
      cidade: str(search["cidade"]),
      estado: str(search["estado"]),
      endereco: str(search["endereco"]) ?? str(search["address"]),
      cor: str(search["cor"]) ?? str(search["color"]),
      logo: str(search["logo"]),
      nicho: str(search["nicho"]) ?? str(search["segmento"]),
      modelo: str(search["modelo"]),
      modo: search["modo"] === "ia" ? "ia" : undefined,
    } as NovoBusca;
  },
  head: () => ({
    meta: [
      { title: "Novo mini-site — Nexa" },
      { name: "description", content: "Crie um novo mini-site para um cliente em três passos." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Novo mini-site — Nexa" },
      { property: "og:description", content: "Cadastro do cliente, escolha do modelo e endereço." },
    ],
  }),
  component: NovoSite,
});

const mapearNichoParaSegmento = (
  nicho: string | undefined,
): { segmento: SegmentoId; modeloId: string } => {
  const nichoParam = (nicho || "").toLowerCase().trim();
  if (!nichoParam) {
    return { segmento: "alimentacao" as SegmentoId, modeloId: modelos[0]!.id };
  }

  const validSegmentIds: SegmentoId[] = [
    "alimentacao",
    "beleza",
    "comercio",
    "servicos",
    "saude",
    "eventos",
    "imoveis",
    "transporte",
    "profissionais",
  ];
  if (validSegmentIds.includes(nichoParam as SegmentoId)) {
    const segId = nichoParam as SegmentoId;
    const defaultModel = modelos.find((m) => m.segmento === segId)?.id || modelos[0]!.id;
    return { segmento: segId, modeloId: defaultModel };
  }

  // Mapeamento por palavras-chave
  let segmento: SegmentoId = "servicos";
  let modeloId = "prestador-servicos";

  if (nichoParam.includes("hamburguer") || nichoParam.includes("burguer")) {
    segmento = "alimentacao";
    modeloId = "hamburgueria-urbana";
  } else if (nichoParam.includes("pizza")) {
    segmento = "alimentacao";
    modeloId = "pizzaria";
  } else if (
    nichoParam.includes("doce") ||
    nichoParam.includes("confeitaria") ||
    nichoParam.includes("bolo")
  ) {
    segmento = "alimentacao";
    modeloId = "doceria";
  } else if (
    nichoParam.includes("restaurante") ||
    nichoParam.includes("comida") ||
    nichoParam.includes("alimenta") ||
    nichoParam.includes("gourmet") ||
    nichoParam.includes("cafe")
  ) {
    segmento = "alimentacao";
    modeloId = "restaurante-moderno";
  } else if (nichoParam.includes("barbearia") || nichoParam.includes("barbeiro")) {
    segmento = "beleza";
    modeloId = "barbearia-premium";
  } else if (
    nichoParam.includes("salao") ||
    nichoParam.includes("beleza") ||
    nichoParam.includes("estetica") ||
    nichoParam.includes("cabeleire") ||
    nichoParam.includes("unha") ||
    nichoParam.includes("manicure")
  ) {
    segmento = "beleza";
    modeloId = "salao-beleza";
  } else if (
    nichoParam.includes("roupa") ||
    nichoParam.includes("vestu") ||
    nichoParam.includes("moda") ||
    nichoParam.includes("loja") ||
    nichoParam.includes("boutique")
  ) {
    segmento = "comercio";
    modeloId = "loja-roupas";
  } else if (
    nichoParam.includes("cosmetico") ||
    nichoParam.includes("perfume") ||
    nichoParam.includes("maquiagem")
  ) {
    segmento = "comercio";
    modeloId = "cosmeticos";
  } else if (nichoParam.includes("dentista") || nichoParam.includes("odonto")) {
    segmento = "saude";
    modeloId = "odontologia";
  } else if (
    nichoParam.includes("clinica") ||
    nichoParam.includes("medico") ||
    nichoParam.includes("saude") ||
    nichoParam.includes("consultorio") ||
    nichoParam.includes("hospital")
  ) {
    segmento = "saude";
    modeloId = "clinica";
  } else if (
    nichoParam.includes("personal") ||
    nichoParam.includes("treino") ||
    nichoParam.includes("fitness") ||
    nichoParam.includes("academia")
  ) {
    segmento = "profissionais";
    modeloId = "personal-trainer";
  } else if (
    nichoParam.includes("foto") ||
    nichoParam.includes("video") ||
    nichoParam.includes("camera")
  ) {
    segmento = "profissionais";
    modeloId = "fotografo";
  } else if (
    nichoParam.includes("advogado") ||
    nichoParam.includes("advocacia") ||
    nichoParam.includes("juridico") ||
    nichoParam.includes("direito")
  ) {
    segmento = "profissionais";
    modeloId = "advocacia";
  } else if (
    nichoParam.includes("corretor") ||
    nichoParam.includes("imobili") ||
    nichoParam.includes("imovel") ||
    nichoParam.includes("apartamento")
  ) {
    segmento = "imoveis";
    modeloId = "corretor";
  } else if (
    nichoParam.includes("transporte") ||
    nichoParam.includes("frete") ||
    nichoParam.includes("transportadora") ||
    nichoParam.includes("mudanca")
  ) {
    segmento = "transporte";
    modeloId = "transportadora";
  } else if (
    nichoParam.includes("evento") ||
    nichoParam.includes("festa") ||
    nichoParam.includes("buffet") ||
    nichoParam.includes("casamento")
  ) {
    segmento = "eventos";
    modeloId = "eventos-festas";
  } else if (
    nichoParam.includes("pet") ||
    nichoParam.includes("cachorro") ||
    nichoParam.includes("gato") ||
    nichoParam.includes("animal") ||
    nichoParam.includes("veteri") ||
    nichoParam.includes("tosa")
  ) {
    segmento = "servicos";
    modeloId = "petshop";
  } else if (
    nichoParam.includes("mecanic") ||
    nichoParam.includes("oficina") ||
    nichoParam.includes("carro") ||
    nichoParam.includes("veiculo")
  ) {
    segmento = "servicos";
    modeloId = "mecanica";
  } else {
    if (nichoParam.includes("aliment") || nichoParam.includes("comid")) {
      segmento = "alimentacao";
      modeloId = "restaurante-moderno";
    } else if (nichoParam.includes("servi")) {
      segmento = "servicos";
      modeloId = "prestador-servicos";
    } else if (nichoParam.includes("comerc") || nichoParam.includes("venda")) {
      segmento = "comercio";
      modeloId = "loja-roupas";
    } else if (nichoParam.includes("profissi") || nichoParam.includes("consult")) {
      segmento = "profissionais";
      modeloId = "personal-trainer";
    }
  }

  return { segmento, modeloId };
};

const extrairCidadeEstado = (
  enderecoParam: string | undefined,
  cidadeParam: string | undefined,
  estadoParam: string | undefined,
): { cidade: string; estado: string } => {
  let cidade = (cidadeParam || "").trim();
  let estado = (estadoParam || "SP").trim().toUpperCase();

  if (!estados.includes(estado)) {
    estado = "SP";
  }

  const end = (enderecoParam || "").trim();
  if (!end) return { cidade, estado };

  const match = end.match(/(?:,|\s|-)\s*([A-Za-z]{2})\s*$/);
  if (match) {
    const parsedUF = (match[1] ?? "").toUpperCase();
    if (parsedUF && estados.includes(parsedUF)) {
      estado = parsedUF;
      const parts = end.substring(0, match.index ?? end.length).split(/(?:,|\s-|-)\s*/);
      if (parts.length > 0) {
        const lastPart = (parts[parts.length - 1] ?? "").trim();
        if (lastPart) {
          cidade = lastPart;
        }
      }
    }
  } else if (!cidade) {
    cidade = end;
  }

  return { cidade, estado };
};

const formatarCorHex = (cor: string | undefined): string | undefined => {
  if (!cor) return undefined;
  const c = cor.trim();
  if (/^[0-9a-fA-F]{3,8}$/.test(c)) {
    return `#${c}`;
  }
  return c;
};

const passos = ["Cliente", "Modelo", "Endereço"];

function NovoSite() {
  const { sites, store } = useNexa();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const nichoInfo = useMemo(() => mapearNichoParaSegmento(search.nicho), [search.nicho]);
  const localizacaoInfo = useMemo(
    () => extrairCidadeEstado(search.endereco, search.cidade, search.estado),
    [search.endereco, search.cidade, search.estado],
  );
  const corInicial = useMemo(() => formatarCorHex(search.cor), [search.cor]);

  const [passo, setPasso] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [acessoIA, setAcessoIA] = useState<"carregando" | "permitido" | "bloqueado">("carregando");

  useEffect(() => {
    let ativo = true;

    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (ativo) setAcessoIA("bloqueado");
        return;
      }

      const [{ data: perfil }, { data: papel }] = await Promise.all([
        supabase
          .from("profiles")
          .select("subscription_tier,subscription_status")
          .eq("id", auth.user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", auth.user.id).maybeSingle(),
      ]);

      if (!ativo) return;
      const planoAtivo =
        perfil?.subscription_status === "active" &&
        (perfil.subscription_tier === "professional" || perfil.subscription_tier === "catalog");
      setAcessoIA(planoAtivo || papel?.role === "admin" ? "permitido" : "bloqueado");
    })();

    return () => {
      ativo = false;
    };
  }, []);

  const [cliente, setCliente] = useState<Cliente>(() => ({
    empresa: search.empresa || "",
    segmento: nichoInfo.segmento,
    responsavel: "",
    telefone: search.whatsapp ? telefoneMask(search.whatsapp) : "",
    email: search.email || "",
    cidade: localizacaoInfo.cidade,
    estado: localizacaoInfo.estado,
  }));
  const [textoImportado, setTextoImportado] = useState("");

  const [modeloId, setModeloId] = useState(() =>
    search.modo === "ia" ? modeloPersonalizado.id : (search.modelo ?? nichoInfo.modeloId),
  );
  const [modoCriacao, setModoCriacao] = useState<"modelo" | "ia">(() =>
    search.modo === "ia" ? "ia" : "modelo",
  );
  const [meuModeloId, setMeuModeloId] = useState<string | null>(null);
  const meusModelos = useSyncExternalStore(
    modelosUsuarioStore.subscribe,
    modelosUsuarioStore.get,
    modelosUsuarioStore.getServer,
  );
  const [slug, setSlug] = useState("");
  const [tocado, setTocado] = useState(false);
  const [filtro, setFiltro] = useState<"recomendados" | "todos">("recomendados");
  const [logoFormato, setLogoFormato] = useState<"redondo" | "quadrado">("redondo");

  const [corPersonalizada, setCorPersonalizada] = useState<string | null>(() => corInicial || null);
  const [logoUrl, setLogoUrl] = useState<string | null>(() => search.logo || null);
  const [enderecoPersonalizado, setEnderecoPersonalizado] = useState<string | null>(
    () => search.endereco || null,
  );

  const sugeridos = useMemo(
    () => modelos.filter((m) => m.segmento === cliente.segmento),
    [cliente.segmento],
  );
  const lista =
    filtro === "todos" || sugeridos.length === 0
      ? modelosCriacao
      : [modeloPersonalizado, ...sugeridos];

  /** Aparência salva pelo usuário, aplicada por cima do modelo escolhido. */
  const meuModelo = meusModelos.find((m) => m.id === meuModeloId);

  const erroEmpresa =
    tocado && cliente.empresa.trim().length < 2 ? "Informe o nome da empresa." : undefined;
  const erroTelefone =
    tocado && cliente.telefone.replace(/\D/g, "").length < 10
      ? "Informe um WhatsApp válido com DDD."
      : undefined;

  const slugFinal = slug || slugify(cliente.empresa);
  const slugEmUso = sites.some((s) => s.slug === slugFinal);

  const previa = useMemo(() => {
    const base = criarSite(
      { ...cliente, empresa: cliente.empresa || "Seu negócio" },
      modoCriacao === "ia" ? modeloPersonalizado.id : modeloId,
      slugFinal || "previa",
    );
    return {
      ...base,
      conteudo: {
        ...base.conteudo,
        ...(logoUrl ? { logo: logoUrl } : {}),
        ...(enderecoPersonalizado ? { endereco: enderecoPersonalizado } : {}),
      },
      aparencia: {
        ...base.aparencia,
        ...(corPersonalizada ? { corPrimaria: corPersonalizada } : {}),
        ...(meuModelo?.aparencia ?? {}),
        logoFormato,
      },
    };
  }, [
    cliente,
    logoFormato,
    meuModelo,
    modoCriacao,
    modeloId,
    slugFinal,
    logoUrl,
    corPersonalizada,
    enderecoPersonalizado,
  ]);

  const podeAvancar =
    passo === 0
      ? cliente.empresa.trim().length > 1 && cliente.telefone.replace(/\D/g, "").length >= 10
      : passo === 1
        ? modoCriacao === "modelo" && !!modeloId
        : slugFinal.length > 2 && !slugEmUso;

  const criarComSite = async (site: Site) => {
    const salvo = await store.adicionarSite(site);
    toast.success("Mini-site gerado", { description: "Revise o conteúdo no editor." });
    void navigate({ to: "/painel/editor/$id", params: { id: salvo.id } });
  };

  const criar = async () => {
    if (!podeAvancar || salvando) return;
    setSalvando(true);
    const base = criarSite(cliente, modeloId, slugFinal);
    const site = {
      ...base,
      conteudo: {
        ...base.conteudo,
        ...(logoUrl ? { logo: logoUrl } : {}),
        ...(enderecoPersonalizado ? { endereco: enderecoPersonalizado } : {}),
      },
      aparencia: {
        ...base.aparencia,
        ...(corPersonalizada ? { corPrimaria: corPersonalizada } : {}),
        ...(meuModelo?.aparencia ?? {}),
        logoFormato,
      },
    };
    try {
      const salvo = await store.adicionarSite(site);
      toast.success("Mini-site criado", { description: "Agora personalize no editor." });
      void navigate({ to: "/painel/editor/$id", params: { id: salvo.id } });
    } catch (error) {
      setSalvando(false);
      toast.error("Não foi possível criar o mini-site", {
        description: error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
      return;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Criar novo mini-site</h1>
          <p className="text-sm text-muted-foreground">
            Três passos rápidos e o cliente já pode ser editado e publicado.
          </p>
        </div>
        <Link
          to="/painel/clientes"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          Cancelar
        </Link>
      </div>

      <div>
        <ol className="flex flex-wrap items-center gap-3">
          {passos.map((p, i) => (
            <li key={p} className="flex items-center gap-2">
              <span
                aria-current={i === passo ? "step" : undefined}
                className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                  i <= passo ? "bg-ink text-ink-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {i < passo ? <Check size={14} /> : i + 1}
              </span>
              <span
                className={i === passo ? "text-sm font-semibold" : "text-sm text-muted-foreground"}
              >
                {p}
              </span>
              {i < passos.length - 1 && <span className="mx-1 h-px w-8 bg-border" />}
            </li>
          ))}
        </ol>
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={passos.length}
          aria-valuenow={passo + 1}
          aria-label={`Passo ${passo + 1} de ${passos.length}: ${passos[passo]}`}
        >
          <div
            className="h-full rounded-full bg-ink transition-[width] duration-300"
            style={{ width: `${((passo + 1) / passos.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="surface p-5 sm:p-6">
          {passo === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                rotulo="Nome da empresa"
                valor={cliente.empresa}
                onChange={(v) => setCliente({ ...cliente, empresa: v })}
                placeholder="Cantina Bella Massa"
                erro={erroEmpresa}
              />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Segmento</span>
                <select
                  value={cliente.segmento}
                  onChange={(e) =>
                    setCliente({ ...cliente, segmento: e.target.value as SegmentoId })
                  }
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-ink"
                >
                  {segmentos.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </label>
              <Campo
                rotulo="Responsável"
                valor={cliente.responsavel}
                onChange={(v) => setCliente({ ...cliente, responsavel: v })}
                placeholder="Maria Silva"
              />
              <Campo
                rotulo="WhatsApp"
                valor={cliente.telefone}
                onChange={(v) => setCliente({ ...cliente, telefone: telefoneMask(v) })}
                placeholder="(11) 98888-1111"
                erro={erroTelefone}
              />
              <Campo
                rotulo="E-mail"
                valor={cliente.email}
                onChange={(v) => setCliente({ ...cliente, email: v })}
                placeholder="contato@empresa.com.br"
              />
              <div className="grid grid-cols-[1fr_100px] gap-3">
                <Campo
                  rotulo="Cidade"
                  valor={cliente.cidade}
                  onChange={(v) => setCliente({ ...cliente, cidade: v })}
                  placeholder="São Paulo"
                />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">UF</span>
                  <select
                    value={cliente.estado}
                    onChange={(e) => setCliente({ ...cliente, estado: e.target.value })}
                    className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-ink"
                  >
                    {estados.map((e) => (
                      <option key={e}>{e}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="sm:col-span-2 rounded-xl border border-border bg-secondary/30 p-3">
                <label className="block">
                  <span className="text-sm font-semibold">
                    Importar texto copiado do Google ou Instagram
                  </span>
                  <textarea
                    value={textoImportado}
                    onChange={(event) => setTextoImportado(event.target.value)}
                    rows={4}
                    placeholder="Cole um texto público com nome, telefone e endereço. A Nexa tenta preencher esses campos; revise tudo antes de continuar."
                    className="mt-2 w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-ink"
                  />
                </label>
                <button
                  type="button"
                  disabled={textoImportado.trim().length < 8}
                  onClick={() => {
                    const dados = importarDadosPublicos(textoImportado);
                    setCliente((atual) => ({
                      ...atual,
                      ...(dados.empresa ? { empresa: dados.empresa } : {}),
                      ...(dados.telefone ? { telefone: telefoneMask(dados.telefone) } : {}),
                      ...(dados.cidade ? { cidade: dados.cidade } : {}),
                      ...(dados.estado ? { estado: dados.estado } : {}),
                      ...(dados.segmento ? { segmento: dados.segmento } : {}),
                    }));
                    if (dados.endereco) setEnderecoPersonalizado(dados.endereco);
                    toast.success("Dados encontrados. Revise os campos antes de continuar.");
                  }}
                  className="mt-2 min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-ink-foreground disabled:opacity-50"
                >
                  Extrair dados do texto
                </button>
              </div>
            </div>
          )}

          {passo === 1 && modoCriacao === "ia" && (
            <div className="max-w-3xl">
              <div className="mb-5 rounded-2xl border border-ink/20 bg-secondary/50 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-ink-foreground">
                    <Wand2 size={18} />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold">Criar do zero com IA</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Nenhum modelo foi escolhido. A IA monta a estrutura, os textos, as cores e as
                      seções a partir da sua descrição e das fotos.
                    </p>
                  </div>
                </div>
              </div>
              <CriacaoIA
                cliente={cliente}
                briefingInicial={textoImportado}
                slug={slugFinal || slugify(cliente.empresa) || "meu-site"}
                verificandoAcesso={acessoIA === "carregando"}
                {...(cliente.empresa.trim().length > 1 &&
                cliente.telefone.replace(/\D/g, "").length >= 10
                  ? {}
                  : {
                      desabilitado: "Volte ao passo Cliente e informe nome da empresa e WhatsApp.",
                    })}
                {...(cliente.empresa.trim().length > 1 &&
                cliente.telefone.replace(/\D/g, "").length >= 10 &&
                acessoIA === "bloqueado"
                  ? {
                      desabilitado:
                        "A criação automática com IA é exclusiva dos planos Profissional e Catálogo. Escolha um plano para liberar esta função.",
                    }
                  : {})}
                onCriar={criarComSite}
              />
            </div>
          )}

          {passo === 1 && modoCriacao === "modelo" && (
            <div>
              <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles size={15} /> Modelos recomendados para este segmento
              </p>
              <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setFiltro("recomendados")}
                  aria-pressed={filtro === "recomendados"}
                  className={`h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold ${
                    filtro === "recomendados"
                      ? "border-ink bg-ink text-ink-foreground"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  Recomendados
                </button>
                <button
                  type="button"
                  onClick={() => setFiltro("todos")}
                  aria-pressed={filtro === "todos"}
                  className={`h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold ${
                    filtro === "todos"
                      ? "border-ink bg-ink text-ink-foreground"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  Todos os modelos
                </button>
              </div>
              {meusModelos.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    Meus modelos salvos (aplicam cores e formas por cima do modelo escolhido)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setMeuModeloId(null)}
                      aria-pressed={meuModeloId === null}
                      className={`min-h-11 rounded-full border px-3.5 text-xs font-semibold ${
                        meuModeloId === null
                          ? "border-ink bg-ink text-ink-foreground"
                          : "border-border hover:bg-secondary"
                      }`}
                    >
                      Nenhum
                    </button>
                    {meusModelos.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMeuModeloId(m.id)}
                        aria-pressed={meuModeloId === m.id}
                        className={`min-h-11 rounded-full border px-3.5 text-xs font-semibold ${
                          meuModeloId === m.id
                            ? "border-ink bg-ink text-ink-foreground"
                            : "border-border hover:bg-secondary"
                        }`}
                      >
                        {m.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="overflow-hidden rounded-2xl border border-border transition-all hover:-translate-y-0.5">
                  <button
                    type="button"
                    onClick={() => setModoCriacao("ia")}
                    aria-pressed={false}
                    className="block w-full text-left"
                  >
                    <span className="relative grid h-36 place-items-center overflow-hidden bg-ink text-ink-foreground">
                      <span className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(184,255,60,.26),transparent_48%)]" />
                      <span className="relative grid h-12 w-12 place-items-center rounded-full bg-lime text-ink">
                        <Wand2 size={22} />
                      </span>
                    </span>
                    <span className="block p-3">
                      <span className="block text-sm font-semibold">Criação automática com IA</span>
                      <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                        Descreva o negócio e envie fotos. A IA sugere modelo, cores, textos e
                        seções.
                      </span>
                      <span className="mt-2 inline-block rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium">
                        IA + fotos
                      </span>
                    </span>
                  </button>
                  <div className="border-t border-border p-2 text-center text-xs text-muted-foreground">
                    Gera uma sugestão para você revisar
                  </div>
                </div>
                {lista.map((m) => {
                  const ativo = modoCriacao === "modelo" && modeloId === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`overflow-hidden rounded-2xl border transition-all ${
                        ativo
                          ? "border-ink ring-2 ring-lime"
                          : "border-border hover:-translate-y-0.5"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setModoCriacao("modelo");
                          setModeloId(m.id);
                        }}
                        aria-pressed={ativo}
                        className="block w-full text-left"
                      >
                        <span className="relative block">
                          <img
                            src={m.imagem}
                            alt={`Modelo ${m.nome}`}
                            loading="lazy"
                            className="h-36 w-full object-cover"
                          />
                          {ativo && (
                            <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-lime text-ink">
                              <Check size={15} />
                            </span>
                          )}
                        </span>
                        <span className="block p-3">
                          <span className="block text-sm font-semibold">{m.nome}</span>
                          <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                            {m.descricao}
                          </span>
                          <span className="mt-2 inline-block rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium">
                            {m.destaque}
                          </span>
                        </span>
                      </button>
                      <div className="border-t border-border p-2">
                        <Link
                          to="/demonstracao/$modelo"
                          params={{ modelo: m.id }}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-xs font-semibold hover:bg-secondary"
                        >
                          <Eye size={14} /> Pré-visualizar
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {passo === 2 && (
            <div className="max-w-md space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Endereço do mini-site</span>
                <div
                  className={`flex items-center gap-2 rounded-xl border bg-card px-3 ${
                    slugEmUso ? "border-ember" : "border-border focus-within:border-ink"
                  }`}
                >
                  <span className="text-sm text-muted-foreground">/site/</span>
                  <input
                    value={slugFinal}
                    aria-invalid={slugEmUso}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    className="h-11 w-full bg-transparent text-sm outline-none"
                  />
                </div>
                <span className="mt-1.5 block text-xs text-muted-foreground">
                  Endereço final:{" "}
                  <span className="font-medium text-foreground">/site/{slugFinal || "…"}</span>
                </span>
              </label>
              {slugEmUso && (
                <p className="text-sm text-ember">Este endereço já está sendo usado.</p>
              )}

              <fieldset className="rounded-2xl border border-border p-4">
                <legend className="px-1 text-sm font-medium">Ícone de perfil</legend>
                <p className="mb-3 text-xs text-muted-foreground">
                  Formato da foto/logo que aparece no topo do mini-site. Você pode mudar depois no
                  editor.
                </p>
                <div className="flex flex-wrap gap-3">
                  {(
                    [
                      { valor: "redondo", rotulo: "Redondo", raio: "999px" },
                      { valor: "quadrado", rotulo: "Quadrado", raio: "12px" },
                    ] as const
                  ).map((op) => (
                    <label
                      key={op.valor}
                      className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-ring ${
                        logoFormato === op.valor
                          ? "border-ink bg-secondary"
                          : "border-border hover:bg-secondary/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="logo-formato"
                        className="sr-only"
                        checked={logoFormato === op.valor}
                        onChange={() => setLogoFormato(op.valor)}
                      />
                      <span
                        aria-hidden="true"
                        className="h-8 w-8 shrink-0 border-2 border-current bg-secondary"
                        style={{ borderRadius: op.raio }}
                      />
                      {op.rotulo}
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="text-sm text-muted-foreground">
                O mini-site é criado como rascunho. Você pode editar tudo e publicar quando quiser.
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
            <button
              type="button"
              disabled={passo === 0}
              onClick={() => setPasso((p) => p - 1)}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              <ArrowLeft size={15} /> Voltar
            </button>
            {passo === 1 && modoCriacao === "ia" ? (
              <button
                type="button"
                onClick={() => setModoCriacao("modelo")}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold hover:bg-secondary"
              >
                Escolher um modelo manualmente
              </button>
            ) : passo < 2 ? (
              <button
                type="button"
                disabled={!podeAvancar}
                onClick={() => {
                  setTocado(true);
                  if (podeAvancar) setPasso((p) => p + 1);
                }}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-ink-foreground disabled:opacity-40"
              >
                Continuar <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                disabled={!podeAvancar || salvando}
                onClick={() => void criar()}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-ink-foreground disabled:opacity-40"
              >
                {salvando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {salvando ? "Criando…" : "Criar e editar"}
              </button>
            )}
          </div>
        </div>

        <div className="hidden justify-center lg:sticky lg:top-20 lg:flex lg:self-start">
          <PhoneFrame largura={240} altura={496}>
            <MiniSite site={previa} compacto botaoFlutuante={false} />
          </PhoneFrame>
        </div>
      </div>
    </div>
  );
}

function Campo({
  rotulo,
  valor,
  onChange,
  placeholder,
  erro,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  erro?: string | undefined;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{rotulo}</span>
      <input
        value={valor}
        placeholder={placeholder}
        aria-invalid={!!erro}
        onChange={(e) => onChange(e.target.value)}
        className={`h-11 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:border-ink ${
          erro ? "border-ember" : "border-border"
        }`}
      />
      {erro && <span className="mt-1.5 block text-xs text-ember">{erro}</span>}
    </label>
  );
}
