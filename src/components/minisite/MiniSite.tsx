import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgePercent,
  Clock,
  Facebook,
  Globe,
  Instagram,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Play,
  Search,
  Star,
  Youtube,
} from "lucide-react";
import { brand, whatsappLink } from "@/lib/nexa/brand";
import {
  agendarHorario,
  dataIso,
  horarioDoDia,
  horariosDoDia,
  horariosOcupados,
  mensagemAgendamento,
  novaChaveIdempotencia,
  proximosDias,
  rotuloDia,
} from "@/lib/nexa/agenda";
import { eventoMarketing } from "@/lib/nexa/rastreio-marketing";
import { urlEmbed } from "@/lib/nexa/media";
import { secaoTemConteudo, secoesSemDuplicadas } from "@/lib/nexa/secoes";
import {
  enviarFormularioPublicado,
  notificarDonoDoMinisite,
  registrarEventoPublicado,
} from "@/lib/nexa/public-api";
import { reservarHospedagem } from "@/lib/nexa/reservas";
import {
  enderecoCardapio,
  itensDestaque,
  lerRascunhoPedido,
  perfilCatalogo,
  salvarRascunhoPedido,
} from "@/lib/nexa/catalogo";
import { estaAberto, moeda } from "@/lib/nexa/utils";
import type { LinkItem, Site } from "@/lib/nexa/types";

/** Contexto de rastreio: ativo apenas no mini-site publicado. */
const RastreioCtx = createContext<(rotulo: string, whatsapp?: boolean) => void>(() => {});
const PublicacaoCtx = createContext(false);
const InteracoesExternasCtx = createContext(true);
export const useRastreio = () => useContext(RastreioCtx);

const fontes: Record<Site["aparencia"]["fonte"], string> = {
  moderna: '"Plus Jakarta Sans", system-ui, sans-serif',
  elegante: 'Georgia, "Times New Roman", serif',
  tecnica: 'ui-monospace, "SFMono-Regular", "Menlo", monospace',
  editorial: '"Bricolage Grotesque", Georgia, serif',
};

const espacos: Record<Site["aparencia"]["espacamento"], string> = {
  compacto: "1.25rem",
  confortavel: "2rem",
  amplo: "3rem",
};

const iconesLink = {
  whatsapp: MessageCircle,
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Play,
  youtube: Youtube,
  site: Globe,
  telefone: Phone,
  email: Mail,
  localizacao: MapPin,
  personalizado: Link2,
} as const;

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full.slice(0, 6) || "000000", 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function MiniSite({
  site,
  compacto = false,
  botaoFlutuante = true,
  rastrear = false,
  interacoesExternas = true,
  modoEdicao = false,
  previewEstreita = false,
}: {
  site: Site;
  compacto?: boolean;
  botaoFlutuante?: boolean;
  /** Registra visitas e cliques no contador local (usado na página publicada). */
  rastrear?: boolean;
  /** Permite abrir WhatsApp, mapas e outros destinos fora da Nexa. */
  interacoesExternas?: boolean;
  /** Exibe marcadores para seções ativas ainda sem itens, somente na prévia do editor. */
  modoEdicao?: boolean;
  /** Ajusta grades e cartões para uma moldura demonstrativa mais estreita que um celular real. */
  previewEstreita?: boolean;
}) {
  const a = site.aparencia;
  const ativas = site.secoes.filter((s) => s.ativa);
  const tem = (t: string) => ativas.some((s) => s.tipo === t);
  // calculado após a hidratação: depende do relógio do visitante
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    const atualizar = () => setAberto(estaAberto(site.conteudo.horarios));
    atualizar();
    const t = setInterval(atualizar, 60000);
    return () => clearInterval(t);
  }, [site.conteudo.horarios]);

  useEffect(() => {
    if (rastrear) void registrarEventoPublicado(site.slug, "visita").catch(() => undefined);
  }, [rastrear, site.slug]);

  const registrar = useMemo(
    () =>
      (rotulo: string, whatsapp = false) => {
        if (rastrear) {
          void registrarEventoPublicado(site.slug, whatsapp ? "whatsapp" : "clique", rotulo).catch(
            () => undefined,
          );
        }
      },
    [rastrear, site.slug],
  );

  const gap = espacos[a.espacamento];

  const style = {
    background: a.corFundo,
    color: a.corTexto,
    fontFamily: fontes[a.fonte],
    ["--ms-primary" as string]: a.corPrimaria,
    ["--ms-radius" as string]: `${a.raio}px`,
    ["--ms-gap" as string]: gap,
    ["--ms-surface" as string]: hexToRgba(a.corTexto, 0.06),
    ["--ms-border" as string]: hexToRgba(a.corTexto, 0.14),
  } as React.CSSProperties;

  const secoesOrdenadas = secoesSemDuplicadas(
    ativas.filter((s) => s.tipo !== "apresentacao" && s.tipo !== "rodape"),
  );

  return (
    <PublicacaoCtx.Provider value={rastrear}>
      <InteracoesExternasCtx.Provider value={interacoesExternas}>
        <RastreioCtx.Provider value={registrar}>
          <div
            style={style}
            data-interacoes-externas={interacoesExternas ? "ativas" : "desativadas"}
            className={`min-h-full w-full overflow-x-hidden text-[15px] leading-relaxed${previewEstreita ? " mini-site-preview-estreita" : ""}`}
          >
            {tem("apresentacao") && <Capa site={site} aberto={aberto} compacto={compacto} />}
            <div
              className="mx-auto w-full max-w-[680px] px-5 pb-28"
              style={{ display: "flex", flexDirection: "column", gap: "var(--ms-gap)" }}
            >
              {secoesOrdenadas.map((s) => (
                <Secao
                  key={s.id}
                  tipo={s.tipo}
                  titulo={s.titulo}
                  site={site}
                  modoEdicao={modoEdicao}
                  conteudo={s.conteudo}
                />
              ))}
            </div>
            {tem("rodape") && <Rodape site={site} />}
            {botaoFlutuante && <BotaoWhatsapp site={site} />}
          </div>
        </RastreioCtx.Provider>
      </InteracoesExternasCtx.Provider>
    </PublicacaoCtx.Provider>
  );
}

/* ------------------------------ capa ------------------------------ */

function Capa({ site, aberto, compacto }: { site: Site; aberto: boolean; compacto: boolean }) {
  const { conteudo, aparencia: a } = site;
  const layout = a.layout;
  const imersivo = layout === "imersivo" || layout === "urbano";
  const alturaEscolhida = a.capaAltura ?? "media";
  const alturaCapa = compacto
    ? "h-40"
    : alturaEscolhida === "baixa"
      ? "h-36"
      : alturaEscolhida === "alta"
        ? "h-[380px]"
        : imersivo
          ? "h-[380px]"
          : "h-52";

  const iniciais = conteudo.nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

  return (
    <header className="relative">
      <div className={`relative w-full overflow-hidden ${alturaCapa}`}>
        {a.capaTipo === "imagem" && conteudo.capa ? (
          <img
            src={conteudo.capa}
            alt={`Capa de ${conteudo.nome}`}
            className="h-full w-full object-cover"
          />
        ) : a.capaTipo === "gradiente" ? (
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, ${a.corPrimaria}, ${hexToRgba(a.corPrimaria, 0.25)})`,
            }}
          />
        ) : (
          <div className="h-full w-full" style={{ background: a.corPrimaria, opacity: 0.85 }} />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${a.corFundo} 4%, ${hexToRgba(a.corFundo, 0.15)} 60%, ${hexToRgba(a.corFundo, 0.35)})`,
          }}
        />
      </div>

      <div
        className={`mx-auto w-full max-w-[680px] px-5 ${imersivo ? "-mt-28" : "-mt-12"} relative pb-6`}
      >
        <div
          className={`flex items-end gap-4 ${layout === "minimalista" || layout === "editorial" ? "flex-col items-start" : ""}`}
        >
          <div
            className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden border-2 text-xl font-bold"
            style={{
              borderRadius:
                a.logoFormato === "quadrado"
                  ? "14px"
                  : a.logoFormato === "redondo"
                    ? "999px"
                    : layout === "urbano"
                      ? "8px"
                      : "999px",
              borderColor: a.corPrimaria,
              background: hexToRgba(a.corTexto, 0.08),
              backdropFilter: "blur(6px)",
            }}
          >
            {conteudo.logo ? (
              <img src={conteudo.logo} alt={conteudo.nome} className="h-full w-full object-cover" />
            ) : (
              <span style={{ color: a.corPrimaria }}>{iniciais.toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <h1
              className={`truncate-none break-words font-semibold ${
                layout === "urbano"
                  ? "text-3xl uppercase tracking-tight"
                  : layout === "editorial"
                    ? "text-3xl"
                    : "text-2xl"
              }`}
              style={{ letterSpacing: layout === "editorial" ? "-0.02em" : undefined }}
            >
              {conteudo.nome}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm opacity-80">
              <span
                suppressHydrationWarning
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  background: aberto ? hexToRgba(a.corPrimaria, 0.18) : "rgba(150,150,150,0.18)",
                  color: aberto ? a.corPrimaria : "inherit",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: aberto ? a.corPrimaria : "currentColor" }}
                />
                {aberto ? "Aberto agora" : "Fechado agora"}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} /> {site.cliente.cidade} - {site.cliente.estado}
              </span>
            </div>
          </div>
        </div>

        {conteudo.descricao && (
          <p
            className={`mt-4 ${layout === "editorial" ? "text-lg" : "text-[15px]"} opacity-85`}
            style={{ maxWidth: "60ch" }}
          >
            {conteudo.descricao}
          </p>
        )}
      </div>
    </header>
  );
}

/* ------------------------------ blocos ------------------------------ */

function Titulo({ children, site }: { children: React.ReactNode; site: Site }) {
  const layout = site.aparencia.layout;
  return (
    <h2
      className={`mb-4 font-semibold ${
        layout === "urbano" ? "text-xl uppercase tracking-wide" : "text-lg"
      }`}
      style={{ color: layout === "colorido" ? site.aparencia.corPrimaria : undefined }}
    >
      {children}
    </h2>
  );
}

function Cartao({
  children,
  site,
  className = "",
}: {
  children: React.ReactNode;
  site: Site;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{
        background: "var(--ms-surface)",
        border: "1px solid var(--ms-border)",
        borderRadius: "var(--ms-radius)",
      }}
    >
      {children}
    </div>
  );
}

function Botao({
  site,
  children,
  href,
  onClick,
  bloco = false,
}: {
  site: Site;
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  bloco?: boolean;
}) {
  const a = site.aparencia;
  const interacoesExternas = useContext(InteracoesExternasCtx);
  const estilos: React.CSSProperties =
    a.botao === "contorno"
      ? { border: `1px solid ${a.corPrimaria}`, color: a.corPrimaria, background: "transparent" }
      : a.botao === "suave"
        ? { background: hexToRgba(a.corPrimaria, 0.16), color: a.corPrimaria }
        : { background: a.corPrimaria, color: contraste(a.corPrimaria) };

  const cls = `inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 ${bloco ? "w-full" : ""}`;
  const radius = a.botao === "pill" ? "999px" : "var(--ms-radius)";

  if (href)
    return (
      <a
        href={interacoesExternas ? href : undefined}
        target={interacoesExternas ? "_blank" : undefined}
        rel={interacoesExternas ? "noreferrer" : undefined}
        aria-disabled={interacoesExternas ? undefined : true}
        onClick={interacoesExternas ? onClick : undefined}
        className={cls}
        style={{ ...estilos, borderRadius: radius }}
      >
        {children}
      </a>
    );
  return (
    <button
      type="button"
      onClick={onClick}
      className={cls}
      style={{ ...estilos, borderRadius: radius }}
    >
      {children}
    </button>
  );
}

function contraste(hex: string) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full.slice(0, 6) || "000000", 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#101010" : "#ffffff";
}

function Secao({
  tipo,
  titulo,
  site,
  modoEdicao,
  conteudo,
}: {
  tipo: string;
  titulo: string;
  site: Site;
  modoEdicao: boolean;
  conteudo?: string | undefined;
}) {
  if (modoEdicao && !secaoTemConteudo(site, tipo, conteudo)) {
    return <SecaoVazia site={site} titulo={titulo} />;
  }

  switch (tipo) {
    case "links":
      return <BlocoLinks site={site} titulo={titulo} />;
    case "produtos":
    case "cardapio":
      return <BlocoProdutos site={site} titulo={titulo} />;
    case "servicos":
      return <BlocoServicos site={site} titulo={titulo} />;
    case "galeria":
      return <BlocoGaleria site={site} titulo={titulo} />;
    case "videos":
      return <BlocoVideos site={site} titulo={titulo} />;
    case "depoimentos":
      return <BlocoDepoimentos site={site} titulo={titulo} />;
    case "equipe":
      return <BlocoEquipe site={site} titulo={titulo} />;
    case "promocao":
    case "cupom":
      return <BlocoCupons site={site} titulo={titulo} />;
    case "localizacao":
      return <BlocoLocalizacao site={site} titulo={titulo} />;
    case "horarios":
      return <BlocoHorarios site={site} titulo={titulo} />;
    case "faq":
      return <BlocoFaq site={site} titulo={titulo} />;
    case "formulario":
      return site.modeloId === "pousada-hotel" ? (
        <BlocoReservaHospedagem site={site} />
      ) : (
        <BlocoFormulario site={site} />
      );
    case "agenda":
      return <BlocoAgenda site={site} titulo={titulo} />;
    case "livre":
      return <BlocoLivre site={site} titulo={titulo} conteudo={conteudo ?? ""} />;
    default:
      return null;
  }
}

function BlocoLivre({ site, titulo, conteudo }: { site: Site; titulo: string; conteudo: string }) {
  const paragrafos = conteudo.split(/\n{2,}/).filter((p) => p.trim());
  if (!paragrafos.length) return null;
  return (
    <section>
      {titulo.trim() && <Titulo site={site}>{titulo}</Titulo>}
      <div className="space-y-3 text-[15px] opacity-90">
        {paragrafos.map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
      </div>
    </section>
  );
}

function SecaoVazia({ site, titulo }: { site: Site; titulo: string }) {
  return (
    <section data-secao-vazia>
      <Titulo site={site}>{titulo}</Titulo>
      <div
        className="px-4 py-5 text-center text-sm opacity-60"
        style={{ border: "1px dashed var(--ms-border)", borderRadius: "var(--ms-radius)" }}
      >
        Seção ativa. Adicione conteúdo na aba Itens.
      </div>
    </section>
  );
}

function urlLink(l: LinkItem) {
  switch (l.tipo) {
    case "whatsapp":
      return whatsappLink(
        l.valor,
        l.mensagem || "Olá! Vim pela sua página e gostaria de mais informações.",
      );
    case "instagram":
      return `https://instagram.com/${l.valor.replace("@", "")}`;
    case "facebook":
      return `https://facebook.com/${l.valor}`;
    case "tiktok":
      return `https://tiktok.com/@${l.valor.replace("@", "")}`;
    case "youtube":
      return `https://youtube.com/${l.valor}`;
    case "telefone":
      return `tel:${l.valor.replace(/\D/g, "")}`;
    case "email":
      return `mailto:${l.valor}`;
    case "localizacao":
      return `https://www.google.com/maps/search/${encodeURIComponent(l.valor)}`;
    default:
      return l.valor.startsWith("http") ? l.valor : `https://${l.valor}`;
  }
}

function BlocoLinks({ site, titulo }: { site: Site; titulo: string }) {
  const registrar = useRastreio();
  const interacoesExternas = useContext(InteracoesExternasCtx);
  const links = site.links.filter((l) => l.ativo);
  if (links.length === 0) return null;
  const grade = site.aparencia.layout === "cards" || site.aparencia.layout === "colorido";
  return (
    <section>
      <Titulo site={site}>{titulo}</Titulo>
      <div className={grade ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
        {links.map((l) => {
          const Icone = iconesLink[l.tipo] ?? Link2;
          return (
            <a
              key={l.id}
              href={interacoesExternas ? urlLink(l) : undefined}
              target={interacoesExternas ? "_blank" : undefined}
              rel={interacoesExternas ? "noreferrer" : undefined}
              aria-disabled={interacoesExternas ? undefined : true}
              onClick={
                interacoesExternas
                  ? () => registrar(l.titulo || l.tipo, l.tipo === "whatsapp")
                  : undefined
              }
              className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5"
              style={{
                background: l.cor ?? "var(--ms-surface)",
                border: "1px solid var(--ms-border)",
                borderRadius: site.aparencia.botao === "pill" ? "999px" : "var(--ms-radius)",
              }}
            >
              <Icone size={18} style={{ color: site.aparencia.corPrimaria }} />
              <span className="truncate">{l.titulo}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function ContadorItem({
  site,
  quantidade,
  onAlterar,
  rotulo,
}: {
  site: Site;
  quantidade: number;
  onAlterar: (delta: number) => void;
  rotulo: string;
}) {
  if (quantidade === 0) {
    return (
      <Botao site={site} bloco onClick={() => onAlterar(1)}>
        Adicionar ao pedido
      </Botao>
    );
  }
  const estilo: React.CSSProperties = {
    border: "1px solid var(--ms-border)",
    borderRadius: "var(--ms-radius)",
  };
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Remover uma unidade de ${rotulo}`}
        onClick={() => onAlterar(-1)}
        className="flex h-11 w-11 items-center justify-center text-lg font-bold"
        style={estilo}
      >
        −
      </button>
      <span className="min-w-8 text-center text-sm font-semibold" aria-live="polite">
        {quantidade}
      </span>
      <button
        type="button"
        aria-label={`Adicionar uma unidade de ${rotulo}`}
        onClick={() => onAlterar(1)}
        className="flex h-11 w-11 items-center justify-center text-lg font-bold"
        style={{
          ...estilo,
          background: site.aparencia.corPrimaria,
          color: contraste(site.aparencia.corPrimaria),
          border: "none",
        }}
      >
        +
      </button>
    </div>
  );
}

function BlocoProdutos({ site, titulo }: { site: Site; titulo: string }) {
  const registrar = useRastreio();
  const interacoesExternas = useContext(InteracoesExternasCtx);
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("Todos");
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [restaurado, setRestaurado] = useState(false);
  const usarCarrinho = site.comercio?.carrinho === true;

  // Rascunho anônimo compartilhado com a página /cardapio (somente navegador).
  useEffect(() => {
    const salvo = lerRascunhoPedido(site.slug);
    if (salvo)
      setCarrinho(
        Object.fromEntries(
          Object.entries(salvo.carrinho ?? {}).map(([id, l]) => [id, l.quantidade]),
        ),
      );
    setRestaurado(true);
  }, [site.slug]);

  useEffect(() => {
    if (!restaurado) return;
    const salvo = lerRascunhoPedido(site.slug);
    salvarRascunhoPedido(site.slug, {
      ...(salvo ?? { modalidade: "entrega" as const, campos: {} }),
      carrinho: Object.fromEntries(
        Object.entries(carrinho).map(([id, q]) => [
          id,
          { quantidade: q, observacao: salvo?.carrinho?.[id]?.observacao ?? "" },
        ]),
      ),
    });
  }, [restaurado, site.slug, carrinho]);
  const alterarQuantidade = (id: string, delta: number) => {
    if (delta > 0) eventoMarketing("add_to_cart", { item_id: id, quantidade: delta });
    setCarrinho((atual) => {
      const proximo = Math.max(0, (atual[id] ?? 0) + delta);
      const copia = { ...atual };
      if (proximo === 0) delete copia[id];
      else copia[id] = proximo;
      return copia;
    });
  };
  const categorias = useMemo(
    () => ["Todos", ...Array.from(new Set(site.produtos.map((p) => p.categoria).filter(Boolean)))],
    [site.produtos],
  );
  const perfil = perfilCatalogo(site);
  const compacto = site.produtos.length > 6;
  const lista = compacto
    ? itensDestaque(site.produtos, 6)
    : site.produtos.filter(
        (p) =>
          (cat === "Todos" || p.categoria === cat) &&
          p.nome.toLowerCase().includes(busca.toLowerCase()),
      );
  if (site.produtos.length === 0) return null;

  const catalogo = site.aparencia.layout === "catalogo" || site.aparencia.layout === "colorido";
  const quantidadeNoCarrinho = Object.values(carrinho).reduce(
    (total, quantidade) => total + quantidade,
    0,
  );
  const totalNoCarrinho = site.produtos.reduce(
    (total, produto) =>
      total + (carrinho[produto.id] ?? 0) * (produto.precoPromocional ?? produto.preco),
    0,
  );

  return (
    <section>
      <Titulo site={site}>{titulo}</Titulo>
      {compacto && (
        <p className="mb-4 text-sm opacity-70">
          Uma seleção do {perfil.rotulo.toLowerCase()}. Veja todos os itens, categorias e promoções
          na página completa.
        </p>
      )}
      <div className={compacto ? "hidden" : "mb-4 flex flex-col gap-3"}>
        <div
          className="flex min-h-11 items-center gap-2 px-3 py-2"
          style={{
            background: "var(--ms-surface)",
            border: "1px solid var(--ms-border)",
            borderRadius: "var(--ms-radius)",
          }}
        >
          <Search size={15} className="opacity-60" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar"
            className="w-full bg-transparent text-sm outline-none placeholder:opacity-50"
            style={{ color: "inherit" }}
          />
        </div>
        {categorias.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {categorias.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className="min-h-11 px-4 py-2.5 text-xs font-medium transition-colors"
                style={{
                  borderRadius: "999px",
                  border: "1px solid var(--ms-border)",
                  background: cat === c ? site.aparencia.corPrimaria : "transparent",
                  color: cat === c ? contraste(site.aparencia.corPrimaria) : "inherit",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={catalogo ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
        {lista.map((p) => (
          <Cartao key={p.id} site={site} className={catalogo ? "" : "flex"}>
            {p.imagem && (
              <img
                src={p.imagem}
                alt={p.nome}
                loading="lazy"
                className={
                  catalogo ? "h-32 w-full object-cover" : "h-24 w-24 shrink-0 object-cover"
                }
              />
            )}
            <div className="min-w-0 flex-1 p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{p.nome}</h3>
                {p.destaque && (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      background: hexToRgba(site.aparencia.corPrimaria, 0.2),
                      color: site.aparencia.corPrimaria,
                    }}
                  >
                    destaque
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs opacity-70">{p.descricao}</p>
              {p.variacoes.length > 0 && (
                <p className="mt-1 text-[11px] opacity-60">{p.variacoes.join(" · ")}</p>
              )}
              {(p.precoPromocional || p.preco > 0) && (
                <div className="mt-2 flex items-center gap-2">
                  {p.precoPromocional ? (
                    <>
                      <span className="text-xs line-through opacity-50">{moeda(p.preco)}</span>
                      <span
                        className="text-sm font-bold"
                        style={{ color: site.aparencia.corPrimaria }}
                      >
                        {moeda(p.precoPromocional)}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-bold">{moeda(p.preco)}</span>
                  )}
                </div>
              )}
              <div className="mt-3">
                {!p.disponivel ? (
                  <span className="text-xs opacity-60">Indisponível no momento</span>
                ) : usarCarrinho ? (
                  <ContadorItem
                    site={site}
                    quantidade={carrinho[p.id] ?? 0}
                    onAlterar={(delta) => alterarQuantidade(p.id, delta)}
                    rotulo={p.nome}
                  />
                ) : (
                  <Botao
                    site={site}
                    bloco
                    href={whatsappLink(
                      site.conteudo.whatsapp,
                      p.precoPromocional || p.preco > 0
                        ? `Olá! Tenho interesse no produto ${p.nome}, no valor de ${moeda(p.precoPromocional ?? p.preco)}.`
                        : `Olá! Tenho interesse no produto ${p.nome}.`,
                    )}
                    onClick={() => registrar(`Produto: ${p.nome}`, true)}
                  >
                    <MessageCircle size={15} /> Pedir pelo WhatsApp
                  </Botao>
                )}
              </div>
            </div>
          </Cartao>
        ))}
      </div>
      {lista.length === 0 && <p className="text-sm opacity-60">Nenhum item encontrado.</p>}
      {compacto && (
        <div className="mt-4">
          <Botao
            site={site}
            bloco
            {...(interacoesExternas ? { href: enderecoCardapio(site.slug) } : {})}
            onClick={() => registrar(`${perfil.rotulo}: ver completo`)}
          >
            {perfil.cta} · {site.produtos.length} itens
          </Botao>
        </div>
      )}
      {usarCarrinho &&
        (() => {
          const itens = site.produtos
            .filter((p) => (carrinho[p.id] ?? 0) > 0)
            .map((p) => ({
              nome: p.nome,
              quantidade: carrinho[p.id] ?? 0,
              preco: p.precoPromocional ?? p.preco,
            }));
          if (itens.length === 0) return null;
          const subtotal = itens.reduce((t, i) => t + i.preco * i.quantidade, 0);
          const entrega = site.comercio?.taxaEntrega ?? 0;
          const minimo = site.comercio?.pedidoMinimo ?? 0;
          const abaixoDoMinimo = minimo > 0 && subtotal < minimo;
          const total = subtotal + entrega;
          const mensagem = [
            `Olá! Quero fazer um pedido pelo site ${site.conteudo.nome}:`,
            ...itens.map((i) => `• ${i.quantidade}x ${i.nome} — ${moeda(i.preco * i.quantidade)}`),
            `Subtotal: ${moeda(subtotal)}`,
            entrega > 0 ? `Entrega: ${moeda(entrega)}` : "",
            `Total: ${moeda(total)}`,
          ]
            .filter(Boolean)
            .join("\n");
          return (
            <Cartao site={site} className="mt-4">
              <div className="flex flex-col gap-2 p-4">
                <h3 className="text-sm font-semibold">Seu pedido</h3>
                {itens.map((i) => (
                  <div key={i.nome} className="flex justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate opacity-80">
                      {i.quantidade}x {i.nome}
                    </span>
                    <span className="shrink-0 font-medium">{moeda(i.preco * i.quantidade)}</span>
                  </div>
                ))}
                {entrega > 0 && (
                  <div className="flex justify-between text-xs opacity-80">
                    <span>Entrega</span>
                    <span>{moeda(entrega)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-sm font-bold">
                  <span>Total</span>
                  <span style={{ color: site.aparencia.corPrimaria }}>{moeda(total)}</span>
                </div>
                {abaixoDoMinimo ? (
                  <p className="text-xs opacity-70">
                    Pedido mínimo de {moeda(minimo)} para enviar pelo WhatsApp.
                  </p>
                ) : (
                  <Botao
                    site={site}
                    bloco
                    {...(interacoesExternas
                      ? { href: whatsappLink(site.conteudo.whatsapp, mensagem) }
                      : {})}
                    onClick={() => {
                      eventoMarketing("iniciar_checkout", { value: total, currency: "BRL" });
                      registrar("Carrinho: enviar pedido", true);
                    }}
                  >
                    <MessageCircle size={15} /> Enviar pedido pelo WhatsApp
                  </Botao>
                )}
                <button
                  type="button"
                  onClick={() => setCarrinho({})}
                  className="min-h-11 text-xs underline opacity-70"
                >
                  Limpar pedido
                </button>
              </div>
            </Cartao>
          );
        })()}
      {interacoesExternas && usarCarrinho && quantidadeNoCarrinho > 0 && (
        <a
          href={enderecoCardapio(site.slug)}
          className="fixed inset-x-4 bottom-4 z-40 flex min-h-12 items-center justify-between gap-3 px-4 text-sm font-semibold shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:inset-x-auto lg:right-6 lg:w-80"
          style={{
            background: site.aparencia.corPrimaria,
            color: contraste(site.aparencia.corPrimaria),
            borderRadius: site.aparencia.botao === "pill" ? "999px" : "var(--ms-radius)",
            outlineColor: site.aparencia.corPrimaria,
          }}
          onClick={() => registrar("Carrinho: ver pedido")}
        >
          <span>
            {quantidadeNoCarrinho} {quantidadeNoCarrinho === 1 ? "item" : "itens"}
          </span>
          <span>Ver pedido · {moeda(totalNoCarrinho)}</span>
        </a>
      )}
    </section>
  );
}

function BlocoServicos({ site, titulo }: { site: Site; titulo: string }) {
  const registrar = useRastreio();
  if (site.servicos.length === 0) return null;
  return (
    <section>
      <Titulo site={site}>{titulo}</Titulo>
      <div className="flex flex-col gap-3">
        {site.servicos.map((s) => (
          <Cartao key={s.id} site={site}>
            <div className="flex items-start justify-between gap-3 p-4">
              {s.imagem && (
                <img
                  src={s.imagem}
                  alt={s.nome}
                  loading="lazy"
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{s.nome}</h3>
                <p className="mt-1 text-xs opacity-70">{s.descricao}</p>
                <p className="mt-1.5 text-[11px] opacity-60">
                  {s.duracao}
                  {s.profissional ? ` · ${s.profissional}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {s.preco > 0 && <p className="text-sm font-bold">{moeda(s.preco)}</p>}
                <div className="mt-2">
                  <Botao
                    site={site}
                    href={whatsappLink(
                      site.conteudo.whatsapp,
                      `Olá! Gostaria de agendar o serviço ${s.nome}.`,
                    )}
                    onClick={() => registrar(`Serviço: ${s.nome}`, true)}
                  >
                    Agendar
                  </Botao>
                </div>
              </div>
            </div>
          </Cartao>
        ))}
      </div>
    </section>
  );
}

function BlocoGaleria({ site, titulo }: { site: Site; titulo: string }) {
  const [ampliada, setAmpliada] = useState<string | null>(null);
  if (site.galeria.length === 0) return null;
  return (
    <section>
      <Titulo site={site}>{titulo}</Titulo>
      <div className="grid grid-cols-3 gap-2">
        {site.galeria.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setAmpliada(g.url)}
            aria-label={
              g.titulo ? `Ampliar ${g.titulo}` : g.tipo === "video" ? "Abrir vídeo" : "Ampliar foto"
            }
            className="relative aspect-square min-h-11 overflow-hidden transition-transform duration-200 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transform-none"
            style={{ borderRadius: "var(--ms-radius)" }}
          >
            {g.tipo === "video" ? (
              <>
                <video src={g.url} muted playsInline className="h-full w-full object-cover" />
                <span className="absolute inset-0 grid place-items-center bg-black/25">
                  <Play size={18} color="#fff" />
                </span>
              </>
            ) : (
              <img
                src={g.url}
                alt={g.titulo}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
          </button>
        ))}
      </div>
      {ampliada && (
        <button
          type="button"
          onClick={() => setAmpliada(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-6"
        >
          {site.galeria.find((g) => g.url === ampliada)?.tipo === "video" ? (
            <video src={ampliada} controls autoPlay className="max-h-[80vh] w-auto rounded-lg" />
          ) : (
            <img src={ampliada} alt="Foto ampliada" className="max-h-[80vh] w-auto rounded-lg" />
          )}
        </button>
      )}
    </section>
  );
}

function BlocoVideos({ site, titulo }: { site: Site; titulo: string }) {
  const videos = site.videos ?? [];
  if (videos.length === 0) return null;
  return (
    <section>
      <Titulo site={site}>{titulo}</Titulo>
      <div className="flex flex-col gap-3">
        {videos.map((v) => {
          const embed = urlEmbed(v.url);
          return (
            <Cartao key={v.id} site={site}>
              <div className="aspect-video w-full bg-black/40">
                {embed?.tipo === "iframe" ? (
                  <iframe
                    src={embed.src}
                    title={v.titulo}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                ) : embed ? (
                  <video
                    src={embed.src}
                    controls
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center">
                    <Play size={22} style={{ color: site.aparencia.corPrimaria }} />
                  </div>
                )}
              </div>
              {(v.titulo || v.descricao) && (
                <div className="p-3">
                  <p className="text-sm font-semibold">{v.titulo}</p>
                  {v.descricao && <p className="mt-1 text-xs opacity-70">{v.descricao}</p>}
                </div>
              )}
            </Cartao>
          );
        })}
      </div>
    </section>
  );
}

function BlocoDepoimentos({ site, titulo }: { site: Site; titulo: string }) {
  if (site.depoimentos.length === 0) return null;
  return (
    <section>
      <Titulo site={site}>{titulo}</Titulo>
      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarColor: `${hexToRgba(site.aparencia.corPrimaria, 0.35)} transparent` }}
      >
        {site.depoimentos.map((d) => (
          <div
            key={d.id}
            className="w-64 shrink-0 snap-start p-4"
            style={{
              background: hexToRgba(site.aparencia.corPrimaria, 0.06),
              border: `1px solid ${hexToRgba(site.aparencia.corPrimaria, 0.16)}`,
              borderRadius: "var(--ms-radius)",
            }}
          >
            <div className="flex gap-0.5">
              {Array.from({ length: d.nota }).map((_, i) => (
                <Star key={i} size={13} fill={site.aparencia.corPrimaria} stroke="none" />
              ))}
            </div>
            <p className="mt-2 text-sm opacity-85">“{d.comentario}”</p>
            <p className="mt-3 text-xs font-semibold">{d.nome}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BlocoEquipe({ site, titulo }: { site: Site; titulo: string }) {
  if (site.equipe.length === 0) return null;
  return (
    <section>
      <Titulo site={site}>{titulo}</Titulo>
      <div className="grid grid-cols-2 gap-3">
        {site.equipe.map((m) => (
          <Cartao key={m.id} site={site}>
            <div className="p-4 text-center">
              {m.foto ? (
                <img
                  src={m.foto}
                  alt={m.nome}
                  loading="lazy"
                  className="mx-auto h-12 w-12 rounded-full object-cover"
                  style={{ border: `1px solid ${hexToRgba(site.aparencia.corPrimaria, 0.35)}` }}
                />
              ) : (
                <div
                  className="mx-auto grid h-12 w-12 place-items-center rounded-full text-sm font-bold"
                  style={{
                    background: hexToRgba(site.aparencia.corPrimaria, 0.2),
                    color: site.aparencia.corPrimaria,
                  }}
                >
                  {m.nome
                    .split(" ")
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")}
                </div>
              )}
              <p className="mt-2 text-sm font-semibold">{m.nome}</p>
              <p className="text-xs opacity-65">{m.funcao}</p>
            </div>
          </Cartao>
        ))}
      </div>
    </section>
  );
}

function BlocoCupons({ site, titulo }: { site: Site; titulo: string }) {
  const cupons = site.cupons.filter((c) => c.ativo);
  const [copiado, setCopiado] = useState<string | null>(null);
  if (cupons.length === 0) return null;
  return (
    <section>
      <Titulo site={site}>{titulo}</Titulo>
      <div className="flex flex-col gap-3">
        {cupons.map((c) => {
          const dias = Math.max(
            0,
            Math.ceil((new Date(c.validade).getTime() - Date.now()) / 86400000),
          );
          return (
            <div
              key={c.id}
              className="nexa-cupom flex items-center justify-between gap-3 p-4"
              style={{
                border: `1px dashed ${site.aparencia.corPrimaria}`,
                borderRadius: "var(--ms-radius)",
                background: hexToRgba(site.aparencia.corPrimaria, 0.08),
              }}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <BadgePercent size={15} style={{ color: site.aparencia.corPrimaria }} />{" "}
                  {c.titulo}
                </p>
                <p className="mt-1 text-xs opacity-70">{c.descricao}</p>
                <p className="mt-1 text-[11px] opacity-60">Expira em {dias} dias</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(c.codigo);
                  setCopiado(c.id);
                  setTimeout(() => setCopiado(null), 1600);
                }}
                className="shrink-0 px-3 py-2 text-xs font-bold"
                style={{
                  background: site.aparencia.corPrimaria,
                  color: contraste(site.aparencia.corPrimaria),
                  borderRadius: "var(--ms-radius)",
                }}
              >
                {copiado === c.id ? "Copiado!" : c.codigo}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BlocoLocalizacao({ site, titulo }: { site: Site; titulo: string }) {
  return (
    <section>
      <Titulo site={site}>{titulo}</Titulo>
      <Cartao site={site}>
        <div
          className="relative h-36 w-full"
          style={{
            background: `repeating-linear-gradient(45deg, ${hexToRgba(site.aparencia.corTexto, 0.05)} 0 12px, transparent 12px 24px)`,
          }}
        >
          <div className="absolute inset-0 grid place-items-center">
            <MapPin size={26} style={{ color: site.aparencia.corPrimaria }} />
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm">{site.conteudo.endereco}</p>
          <div className="mt-3">
            <Botao
              site={site}
              bloco
              href={`https://www.google.com/maps/search/${encodeURIComponent(site.conteudo.endereco)}`}
            >
              <MapPin size={15} /> Abrir no mapa
            </Botao>
          </div>
        </div>
      </Cartao>
    </section>
  );
}

function BlocoHorarios({ site, titulo }: { site: Site; titulo: string }) {
  return (
    <section>
      <Titulo site={site}>{titulo}</Titulo>
      <Cartao site={site}>
        <ul className="divide-y" style={{ borderColor: "var(--ms-border)" }}>
          {site.conteudo.horarios.map((h) => (
            <li key={h.dia} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="flex items-center gap-2 opacity-80">
                <Clock size={13} /> {h.dia}
              </span>
              <span className="font-medium">
                {h.fechado ? "Fechado" : `${h.abre} – ${h.fecha}`}
              </span>
            </li>
          ))}
        </ul>
      </Cartao>
    </section>
  );
}

function BlocoFaq({ site, titulo }: { site: Site; titulo: string }) {
  const [aberta, setAberta] = useState<string | null>(null);
  if (site.faq.length === 0) return null;
  return (
    <section>
      <Titulo site={site}>{titulo}</Titulo>
      <div className="flex flex-col gap-2">
        {site.faq.map((f) => (
          <Cartao key={f.id} site={site}>
            <button
              type="button"
              onClick={() => setAberta(aberta === f.id ? null : f.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium"
            >
              {f.pergunta}
              <span style={{ color: site.aparencia.corPrimaria }}>
                {aberta === f.id ? "–" : "+"}
              </span>
            </button>
            {aberta === f.id && <p className="px-4 pb-4 text-sm opacity-75">{f.resposta}</p>}
          </Cartao>
        ))}
      </div>
    </section>
  );
}

function BlocoAgenda({ site, titulo }: { site: Site; titulo: string }) {
  const publicado = useContext(PublicacaoCtx);
  const interacoesExternas = useContext(InteracoesExternasCtx);
  const registrar = useRastreio();
  const dias = useMemo(
    () =>
      proximosDias(site.agenda?.diasVisiveis ?? 14).filter(
        (d) => horarioDoDia(site.conteudo.horarios, d)?.fechado === false,
      ),
    [site.agenda?.diasVisiveis, site.conteudo.horarios],
  );
  const [dia, setDia] = useState<Date | null>(dias[0] ?? null);
  const [hora, setHora] = useState<string | null>(null);
  const [ocupados, setOcupados] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<{ data: Date; hora: string; token: string } | null>(
    null,
  );
  const chaveEnvio = useRef(novaChaveIdempotencia());
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [servico, setServico] = useState("");

  useEffect(() => {
    setHora(null);
    setOcupados([]);
    if (!dia || !publicado) return;
    let ativo = true;
    setCarregando(true);
    horariosOcupados(site.slug, dataIso(dia))
      .then((lista) => ativo && setOcupados(lista))
      .catch(() => ativo && setErro("Não foi possível carregar os horários ocupados."))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [dia, publicado, site.slug]);

  if (dias.length === 0) return null;

  const horas = dia ? horariosDoDia(site.conteudo.horarios, dia, site.agenda?.intervalo ?? 30) : [];

  if (confirmado) {
    const mensagem = mensagemAgendamento(site, {
      data: confirmado.data,
      hora: confirmado.hora,
      nome,
      telefone,
      servico,
    });
    return (
      <section>
        <Titulo site={site}>{titulo}</Titulo>
        <Cartao site={site}>
          <div className="flex flex-col gap-3 p-4">
            <p className="text-sm font-semibold" style={{ color: site.aparencia.corPrimaria }}>
              Horário confirmado para {confirmado.data.toLocaleDateString("pt-BR")} às{" "}
              {confirmado.hora}.
            </p>
            <p className="text-xs opacity-70">
              Esse horário já ficou bloqueado para outras pessoas.
            </p>
            {confirmado.token && (
              <a
                href={`/agendamento/${confirmado.token}`}
                target="_blank"
                rel="noreferrer"
                className="min-h-11 text-xs font-semibold underline"
                style={{ color: site.aparencia.corPrimaria }}
              >
                Ver comprovante e cancelar, se precisar
              </a>
            )}
            {site.conteudo.whatsapp && (
              <Botao
                site={site}
                bloco
                {...(interacoesExternas
                  ? { href: whatsappLink(site.conteudo.whatsapp, mensagem) }
                  : {})}
                onClick={() => registrar("Agenda: confirmar no WhatsApp", true)}
              >
                <MessageCircle size={15} /> Enviar confirmação no WhatsApp
              </Botao>
            )}
          </div>
        </Cartao>
      </section>
    );
  }

  return (
    <section>
      <Titulo site={site}>{titulo}</Titulo>
      <Cartao site={site}>
        <form
          className="flex flex-col gap-3 p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (enviando || !dia || !hora) return;
            if (!publicado) {
              setErro("O agendamento fica disponível no mini-site publicado.");
              return;
            }
            setErro(null);
            setEnviando(true);
            try {
              const reserva = await agendarHorario({
                slug: site.slug,
                data: dataIso(dia),
                hora,
                nome: nome.trim(),
                telefone: telefone.trim(),
                servico,
                chave: chaveEnvio.current,
              });
              notificarDonoDoMinisite("agendamento", reserva.id);
              registrar(`Agenda: ${dataIso(dia)} ${hora}`);
              if (!reserva.repetido) {
                eventoMarketing("agendamento_confirmado", {
                  data: reserva.data,
                  hora: reserva.hora,
                  servico: servico || "",
                });
              }
              setConfirmado({ data: dia, hora, token: reserva.token });
            } catch (error) {
              setErro(error instanceof Error ? error.message : "Não foi possível agendar.");
              if (dia)
                horariosOcupados(site.slug, dataIso(dia))
                  .then(setOcupados)
                  .catch(() => {});
            } finally {
              setEnviando(false);
            }
          }}
        >
          <div
            className="flex flex-col gap-1 pb-1"
            style={{ borderBottom: "1px solid var(--ms-border)" }}
          >
            <p className="text-sm font-semibold">Escolha um horário disponível</p>
            {site.agenda?.observacao && (
              <p className="text-xs opacity-70">{site.agenda.observacao}</p>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">
              1. Escolha o dia
            </p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {dias.map((d) => {
                const ativo = dia !== null && dataIso(d) === dataIso(dia);
                const [nomeDia = "", numero = ""] = rotuloDia(d).split(" ");
                return (
                  <button
                    key={dataIso(d)}
                    type="button"
                    onClick={() => setDia(d)}
                    aria-pressed={ativo}
                    className="flex min-h-11 w-16 shrink-0 flex-col items-center justify-center gap-0.5 px-2 py-2 leading-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none"
                    style={{
                      borderRadius: "var(--ms-radius)",
                      border: `1px solid ${ativo ? site.aparencia.corPrimaria : "var(--ms-border)"}`,
                      background: ativo ? site.aparencia.corPrimaria : "transparent",
                      color: ativo ? contraste(site.aparencia.corPrimaria) : "inherit",
                      outlineColor: site.aparencia.corPrimaria,
                    }}
                  >
                    <span className="text-[10px] uppercase opacity-70">{nomeDia}</span>
                    <span className="text-sm font-semibold">{numero}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                2. Escolha o horário
              </p>
              <p className="flex items-center gap-3 text-[11px] opacity-70">
                <span className="inline-flex items-center gap-1">
                  <span
                    aria-hidden
                    className="inline-block size-2 rounded-full"
                    style={{ background: site.aparencia.corPrimaria }}
                  />
                  selecionado
                </span>
                <span className="inline-flex items-center gap-1 line-through">ocupado</span>
              </p>
            </div>
            <div aria-live="polite">
              {carregando ? (
                <div className="flex flex-wrap gap-2" aria-hidden>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span
                      key={i}
                      className="h-11 w-16 animate-pulse motion-reduce:animate-none"
                      style={{
                        borderRadius: "var(--ms-radius)",
                        background: "var(--ms-border)",
                      }}
                    />
                  ))}
                </div>
              ) : horas.length === 0 ? (
                <p className="text-xs opacity-60">Sem horários disponíveis neste dia.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {horas.map((h) => {
                    const indisponivel = ocupados.includes(h);
                    const ativo = hora === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        disabled={indisponivel}
                        onClick={() => setHora(h)}
                        aria-pressed={ativo}
                        aria-label={indisponivel ? `${h} — horário ocupado` : `${h} — disponível`}
                        title={indisponivel ? "Horário já reservado" : undefined}
                        className="min-h-11 min-w-16 px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:font-normal disabled:opacity-45 disabled:line-through motion-reduce:transition-none"
                        style={{
                          borderRadius: "var(--ms-radius)",
                          border: `1px solid ${ativo ? site.aparencia.corPrimaria : "var(--ms-border)"}`,
                          background: ativo ? site.aparencia.corPrimaria : "transparent",
                          color: ativo ? contraste(site.aparencia.corPrimaria) : "inherit",
                          outlineColor: site.aparencia.corPrimaria,
                        }}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              )}
              {!carregando && horas.length > 0 && (
                <p className="mt-2 text-[11px] opacity-70">
                  {hora
                    ? `Horário ${hora} selecionado. Confirme abaixo com seus dados.`
                    : "Toque em um horário para continuar."}
                </p>
              )}
            </div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">3. Seus dados</p>
          {site.servicos.length > 0 && (
            <select
              value={servico}
              onChange={(e) => setServico(e.target.value)}
              aria-label="Serviço"
              className="min-h-11 w-full bg-transparent px-3 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--ms-border)", borderRadius: "var(--ms-radius)" }}
            >
              <option value="">Serviço (opcional)</option>
              {site.servicos.map((s) => (
                <option key={s.id} value={s.nome}>
                  {s.nome}
                </option>
              ))}
            </select>
          )}
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            maxLength={120}
            aria-label="Seu nome"
            placeholder="Seu nome"
            className="min-h-11 w-full bg-transparent px-3 py-2 text-sm outline-none placeholder:opacity-50"
            style={{ border: "1px solid var(--ms-border)", borderRadius: "var(--ms-radius)" }}
          />
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            required
            maxLength={40}
            inputMode="tel"
            aria-label="Seu WhatsApp"
            placeholder="Seu WhatsApp"
            className="min-h-11 w-full bg-transparent px-3 py-2 text-sm outline-none placeholder:opacity-50"
            style={{ border: "1px solid var(--ms-border)", borderRadius: "var(--ms-radius)" }}
          />
          {erro && (
            <p
              role="alert"
              className="px-3 py-2 text-sm font-medium"
              style={{
                borderRadius: "var(--ms-radius)",
                border: "1px solid var(--ms-border)",
                background: "color-mix(in srgb, currentColor 6%, transparent)",
              }}
            >
              {erro}
            </p>
          )}
          <button
            type="submit"
            disabled={enviando || !hora}
            className="min-h-11 px-4 py-3 text-sm font-semibold transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            style={{
              background: site.aparencia.corPrimaria,
              color: contraste(site.aparencia.corPrimaria),
              borderRadius: "var(--ms-radius)",
              outlineColor: site.aparencia.corPrimaria,
            }}
          >
            {enviando ? "Confirmando…" : hora ? `Confirmar ${hora}` : "Selecione um horário"}
          </button>
        </form>
      </Cartao>
    </section>
  );
}

function BlocoReservaHospedagem({ site }: { site: Site }) {
  const publicado = useContext(PublicacaoCtx);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmada, setConfirmada] = useState<{ checkIn: string; checkOut: string } | null>(null);
  const chave = useRef(novaChaveIdempotencia());
  const hoje = dataIso(new Date());

  if (confirmada) {
    return (
      <section>
        <Titulo site={site}>Reserva solicitada</Titulo>
        <Cartao site={site}>
          <p className="p-4 text-sm font-medium" style={{ color: site.aparencia.corPrimaria }}>
            Reserva confirmada de{" "}
            {new Date(`${confirmada.checkIn}T12:00:00`).toLocaleDateString("pt-BR")} a{" "}
            {new Date(`${confirmada.checkOut}T12:00:00`).toLocaleDateString("pt-BR")}. A pousada
            receberá seus dados para o atendimento.
          </p>
        </Cartao>
      </section>
    );
  }

  return (
    <section>
      <Titulo site={site}>Reserve sua estadia</Titulo>
      <Cartao site={site}>
        <form
          className="flex flex-col gap-3 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (enviando) return;
            if (!publicado) {
              setErro("A reserva fica disponível no mini-site publicado.");
              return;
            }
            const dados = new FormData(event.currentTarget);
            setErro(null);
            setEnviando(true);
            try {
              const reserva = await reservarHospedagem({
                slug: site.slug,
                checkIn: String(dados.get("check-in") ?? ""),
                checkOut: String(dados.get("check-out") ?? ""),
                acomodacao: String(dados.get("acomodacao") ?? "principal"),
                hospedes: Number(dados.get("hospedes") ?? 0),
                nome: String(dados.get("nome") ?? "").trim(),
                telefone: String(dados.get("telefone") ?? "").trim(),
                email: String(dados.get("email") ?? "").trim(),
                observacao: String(dados.get("observacao") ?? "").trim(),
                chave: chave.current,
              });
              notificarDonoDoMinisite("reserva", reserva.id);
              setConfirmada({ checkIn: reserva.checkIn, checkOut: reserva.checkOut });
            } catch (error) {
              setErro(error instanceof Error ? error.message : "Não foi possível reservar.");
            } finally {
              setEnviando(false);
            }
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold">
              Check-in
              <input
                name="check-in"
                type="date"
                min={hoje}
                required
                className="mt-1 min-h-11 w-full bg-transparent px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--ms-border)", borderRadius: "var(--ms-radius)" }}
              />
            </label>
            <label className="text-xs font-semibold">
              Check-out
              <input
                name="check-out"
                type="date"
                min={hoje}
                required
                className="mt-1 min-h-11 w-full bg-transparent px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--ms-border)", borderRadius: "var(--ms-radius)" }}
              />
            </label>
          </div>
          <input name="acomodacao" defaultValue="principal" type="hidden" />
          <label className="text-xs font-semibold">
            Hóspedes
            <select
              name="hospedes"
              defaultValue="2"
              className="mt-1 min-h-11 w-full bg-transparent px-3 py-2 text-sm outline-none"
              style={{ border: "1px solid var(--ms-border)", borderRadius: "var(--ms-radius)" }}
            >
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} {i === 0 ? "hóspede" : "hóspedes"}
                </option>
              ))}
            </select>
          </label>
          <input
            name="nome"
            required
            maxLength={120}
            placeholder="Nome completo"
            aria-label="Nome completo"
            className="min-h-11 w-full bg-transparent px-3 py-2 text-sm outline-none"
            style={{ border: "1px solid var(--ms-border)", borderRadius: "var(--ms-radius)" }}
          />
          <input
            name="telefone"
            required
            maxLength={40}
            placeholder="WhatsApp"
            aria-label="WhatsApp"
            className="min-h-11 w-full bg-transparent px-3 py-2 text-sm outline-none"
            style={{ border: "1px solid var(--ms-border)", borderRadius: "var(--ms-radius)" }}
          />
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            placeholder="E-mail"
            aria-label="E-mail"
            className="min-h-11 w-full bg-transparent px-3 py-2 text-sm outline-none"
            style={{ border: "1px solid var(--ms-border)", borderRadius: "var(--ms-radius)" }}
          />
          <textarea
            name="observacao"
            maxLength={1000}
            rows={3}
            placeholder="Pedido especial (opcional)"
            aria-label="Pedido especial"
            className="w-full bg-transparent px-3 py-2 text-sm outline-none"
            style={{ border: "1px solid var(--ms-border)", borderRadius: "var(--ms-radius)" }}
          />
          {erro && (
            <p role="alert" className="text-sm font-medium">
              {erro}
            </p>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="min-h-11 px-4 py-3 text-sm font-semibold disabled:opacity-60"
            style={{
              background: site.aparencia.corPrimaria,
              color: contraste(site.aparencia.corPrimaria),
              borderRadius: "var(--ms-radius)",
            }}
          >
            {enviando ? "Confirmando…" : "Confirmar reserva"}
          </button>
        </form>
      </Cartao>
    </section>
  );
}

function BlocoFormulario({ site }: { site: Site }) {
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const publicado = useContext(PublicacaoCtx);
  return (
    <section>
      <Titulo site={site}>{site.formulario.titulo}</Titulo>
      <Cartao site={site}>
        <form
          className="flex flex-col gap-3 p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (enviando) return;
            if (!publicado) {
              setErro("O envio fica disponível no mini-site publicado.");
              return;
            }
            const form = e.currentTarget;
            const formData = new FormData(form);
            if (String(formData.get("website") ?? "").trim()) {
              setErro("Não foi possível enviar sua mensagem.");
              return;
            }
            const dados = Object.fromEntries(
              site.formulario.campos.map((campo) => [
                campo.id,
                String(formData.get(campo.id) ?? "")
                  .trim()
                  .slice(0, 2000),
              ]),
            );
            setErro(null);
            setEnviando(true);
            try {
              const envio = await enviarFormularioPublicado(site.slug, dados);
              notificarDonoDoMinisite("formulario", String(envio ?? ""));
              form.reset();
              setEnviado(true);
            } catch (error) {
              setErro(error instanceof Error ? error.message : "Não foi possível enviar.");
            } finally {
              setEnviando(false);
            }
          }}
        >
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />
          {site.formulario.campos.map((c) =>
            c.tipo === "textarea" ? (
              <textarea
                key={c.id}
                name={c.id}
                required={c.obrigatorio}
                aria-label={c.rotulo}
                placeholder={c.rotulo}
                maxLength={2000}
                rows={3}
                className="w-full bg-transparent px-3 py-2 text-sm outline-none placeholder:opacity-50"
                style={{ border: "1px solid var(--ms-border)", borderRadius: "var(--ms-radius)" }}
              />
            ) : (
              <input
                key={c.id}
                name={c.id}
                required={c.obrigatorio}
                aria-label={c.rotulo}
                type={c.tipo === "email" ? "email" : c.tipo === "data" ? "date" : "text"}
                placeholder={c.rotulo}
                maxLength={2000}
                className="w-full bg-transparent px-3 py-2 text-sm outline-none placeholder:opacity-50"
                style={{ border: "1px solid var(--ms-border)", borderRadius: "var(--ms-radius)" }}
              />
            ),
          )}
          {erro && (
            <p role="alert" className="text-sm font-medium">
              {erro}
            </p>
          )}
          {enviado ? (
            <p className="text-sm font-medium" style={{ color: site.aparencia.corPrimaria }}>
              Recebemos sua mensagem! Em breve entramos em contato.
            </p>
          ) : (
            <button
              type="submit"
              disabled={enviando}
              className="px-4 py-3 text-sm font-semibold"
              style={{
                background: site.aparencia.corPrimaria,
                color: contraste(site.aparencia.corPrimaria),
                borderRadius: "var(--ms-radius)",
              }}
            >
              {enviando ? "Enviando…" : "Enviar"}
            </button>
          )}
        </form>
      </Cartao>
    </section>
  );
}

function Rodape({ site }: { site: Site }) {
  return (
    <footer
      className="mt-8 px-5 py-8 text-center text-xs opacity-60"
      style={{ borderTop: "1px solid var(--ms-border)" }}
    >
      <p className="font-medium">{site.conteudo.nome}</p>
      <p className="mt-1">{site.conteudo.endereco}</p>
      {site.mostrarAssinaturaNexa !== false && <p className="mt-3">{brand.assinatura}</p>}
    </footer>
  );
}

function BotaoWhatsapp({ site }: { site: Site }) {
  const registrar = useRastreio();
  const interacoesExternas = useContext(InteracoesExternasCtx);
  if (!site.conteudo.whatsapp) return null;
  return (
    <a
      href={
        interacoesExternas
          ? whatsappLink(site.conteudo.whatsapp, `Olá! Vim pela página de ${site.conteudo.nome}.`)
          : undefined
      }
      target={interacoesExternas ? "_blank" : undefined}
      rel={interacoesExternas ? "noreferrer" : undefined}
      aria-disabled={interacoesExternas ? undefined : true}
      aria-label="Falar no WhatsApp"
      onClick={interacoesExternas ? () => registrar("Botão flutuante WhatsApp", true) : undefined}
      className="absolute bottom-5 right-5 grid h-14 w-14 place-items-center shadow-lg transition-transform duration-200 hover:scale-105"
      style={{
        position: "fixed",
        borderRadius: "999px",
        background: "#25D366",
        color: "#fff",
      }}
    >
      <MessageCircle size={24} />
    </a>
  );
}
