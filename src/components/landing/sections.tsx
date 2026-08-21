import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  Globe,
  Image as ImageIcon,
  Instagram,
  MapPin,
  MessageCircle,
  Palette,
  QrCode,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { GraficoArea, GraficoBarras } from "@/components/Graficos";
import { PhoneFrame } from "@/components/PhoneFrame";
import { Reveal } from "@/components/Reveal";
import { MiniSite } from "@/components/minisite/MiniSite";
import { Logo } from "@/components/Logo";
import { whatsappLink } from "@/lib/nexa/brand";
import { useMarca } from "@/lib/nexa/hooks";
import { modelos } from "@/lib/nexa/modelos";
import { siteDoModelo } from "@/lib/nexa/demo-modelos";
import { segmentos } from "@/lib/nexa/segmentos";
import { numero } from "@/lib/nexa/utils";

/* -------------------------------- HERO -------------------------------- */

const heroModelos = ["restaurante-moderno", "barbearia-premium", "loja-roupas"];

const avisos = [
  { texto: "Pedido recebido pelo WhatsApp", icone: MessageCircle },
  { texto: "Novo agendamento", icone: Calendar },
  { texto: "Cupom utilizado", icone: Tag },
  { texto: "+37 visitas hoje", icone: BarChart3 },
];

export function Hero() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [ativo, setAtivo] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const sites = useMemo(() => heroModelos.map((m) => siteDoModelo(m)), []);

  useEffect(() => {
    const id = setInterval(() => setAtivo((v) => (v + 1) % heroModelos.length), 4200);
    return () => clearInterval(id);
  }, []);

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setMouse({
      x: (e.clientX - r.left - r.width / 2) / r.width,
      y: (e.clientY - r.top - r.height / 2) / r.height,
    });
  };

  return (
    <section className="relative overflow-hidden pb-16 pt-10 md:pb-28 md:pt-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-lime/25 blur-[120px]"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1fr_auto]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles size={13} className="text-ink" />
            Plataforma brasileira de mini-sites profissionais
          </span>
          <h1 className="mt-6 text-[2.6rem] font-extrabold leading-[1.03] md:text-6xl">
            Seu negócio merece mais do que apenas um link.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Crie uma página profissional com WhatsApp, catálogo, serviços, agendamentos,
            localização, redes sociais e tudo o que seus clientes precisam encontrar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/modelos"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-ink-foreground transition-transform hover:-translate-y-0.5"
            >
              Conhecer os modelos <ArrowRight size={16} />
            </Link>
            <Link
              to="/demonstracao/$modelo"
              params={{ modelo: "restaurante-moderno" }}
              className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-card px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              Ver demonstração
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Check size={15} className="text-ink" /> Sem instalar aplicativo
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={15} className="text-ink" /> Pronto em minutos
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={15} className="text-ink" /> Feito para celular
            </span>
          </div>
        </div>

        <div
          ref={ref}
          onMouseMove={onMove}
          onMouseLeave={() => setMouse({ x: 0, y: 0 })}
          className="relative mx-auto hidden h-[640px] w-[560px] lg:block"
        >
          {sites.map((s, i) => {
            const pos = (i - ativo + 3) % 3;
            const base = [
              { x: 130, y: 0, r: 0, z: 30, e: 1 },
              { x: 0, y: 44, r: -7, z: 20, e: 0.94 },
              { x: 268, y: 60, r: 7, z: 10, e: 0.9 },
            ][pos]!;
            return (
              <div
                key={s.id}
                className="absolute transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  left: base.x,
                  top: base.y,
                  zIndex: base.z,
                  transform: `rotate(${base.r}deg) scale(${base.e}) translate3d(${mouse.x * (12 + pos * 8)}px, ${mouse.y * (10 + pos * 6)}px, 0)`,
                  opacity: pos === 0 ? 1 : 0.92,
                }}
              >
                <PhoneFrame largura={272} altura={560}>
                  <MiniSite site={s} compacto botaoFlutuante={false} interacoesExternas={false} />
                </PhoneFrame>
              </div>
            );
          })}

          {avisos.map((a, i) => {
            const Icone = a.icone;
            const spots = [
              { top: 60, left: -10 },
              { top: 200, right: -20 },
              { bottom: 150, left: -30 },
              { bottom: 40, right: 10 },
            ][i]!;
            return (
              <div
                key={a.texto}
                className="float-slow absolute z-40 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold shadow-[var(--shadow-soft)]"
                style={{ ...spots, animationDelay: `${i * 0.9}s` }}
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-lime/25 text-ink">
                  <Icone size={13} />
                </span>
                {a.texto}
              </div>
            );
          })}
        </div>

        <div className="mx-auto lg:hidden">
          <PhoneFrame largura={280} altura={560}>
            <MiniSite
              site={sites[ativo]!}
              compacto
              botaoFlutuante={false}
              interacoesExternas={false}
            />
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- CREDIBILIDADE ---------------------------- */

const nichos = [
  "Restaurantes",
  "Lojas",
  "Barbearias",
  "Salões",
  "Transportadoras",
  "Clínicas",
  "Fotógrafos",
  "Corretores",
  "Oficinas",
  "Academias",
  "Profissionais autônomos",
];

export function FaixaSegmentos() {
  return (
    <section className="overflow-hidden border-y border-border bg-sand py-4">
      <div className="flex w-max marquee-track gap-3">
        {[...nichos, ...nichos].map((n, i) => (
          <span
            key={`${n}-${i}`}
            className="whitespace-nowrap rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground"
          >
            {n}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------- COMPARAÇÃO ----------------------------- */

export function Comparacao() {
  const marca = useMarca();
  const [pos, setPos] = useState(48);
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <Reveal>
        <h2 className="max-w-3xl text-3xl font-extrabold md:text-5xl">
          Transforme um perfil comum em uma verdadeira vitrine digital.
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Arraste para comparar uma página de links tradicional com um mini-site completo do{" "}
          {marca.nome}.
        </p>
      </Reveal>

      <Reveal delay={80}>
        <div className="relative mt-10 h-[520px] select-none overflow-hidden rounded-3xl border border-border bg-ink">
          <div className="absolute inset-0 grid place-items-center bg-[#151515] p-8">
            <div className="w-full max-w-xs space-y-3">
              <div className="mx-auto h-16 w-16 rounded-full bg-white/10" />
              <p className="text-center text-sm font-semibold text-white/70">@seunegocio</p>
              {["WhatsApp", "Instagram", "Cardápio", "Endereço", "Site"].map((b) => (
                <div
                  key={b}
                  className="rounded-lg border border-white/15 py-3 text-center text-sm text-white/70"
                >
                  {b}
                </div>
              ))}
            </div>
            <span className="absolute left-5 top-5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
              Antes
            </span>
          </div>

          <div
            className="absolute inset-0 overflow-hidden bg-background"
            style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
          >
            <div className="grid h-full place-items-center p-6">
              <PhoneFrame largura={280} altura={470}>
                <MiniSite
                  site={siteDoModelo("restaurante-moderno")}
                  compacto
                  botaoFlutuante={false}
                  interacoesExternas={false}
                />
              </PhoneFrame>
            </div>
            <span className="absolute right-5 top-5 rounded-full bg-lime px-3 py-1 text-xs font-bold text-ink">
              Depois
            </span>
          </div>

          <div
            className="pointer-events-none absolute inset-y-0 w-0.5 bg-lime"
            style={{ left: `${pos}%` }}
          >
            <span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-lime text-ink shadow-lg">
              <ArrowRight size={16} />
            </span>
          </div>
          <input
            type="range"
            min={8}
            max={92}
            value={pos}
            aria-label="Comparar antes e depois"
            onChange={(e) => setPos(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
          />
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------ RECURSOS ------------------------------ */

const recursos = [
  "Link direto para WhatsApp",
  "Catálogo de produtos",
  "Cardápio digital",
  "Lista de serviços",
  "Botão de agendamento",
  "Mapa e localização",
  "Horários de atendimento",
  "Redes sociais",
  "Galeria de fotos",
  "Vídeos",
  "Depoimentos e avaliações",
  "Cupons de desconto",
  "Promoções temporárias",
  "Perguntas frequentes",
  "Formulário de orçamento",
  "Pix Copia e Cola (em breve)",
  "QR Code automático",
  "Domínio personalizado (em breve)",
  "Pixel da Meta (em breve)",
  "Google Analytics (em breve)",
  "Estatísticas de acessos",
  "Botões personalizados",
  "Tema claro ou escuro",
  "Compartilhamento rápido",
  "Aviso de aberto ou fechado",
];

export function Recursos() {
  return (
    <section id="recursos" className="bg-ink py-20 text-ink-foreground md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-extrabold md:text-5xl">
            Tudo o que seu cliente procura, em um só lugar.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-6">
          <Reveal className="md:col-span-3">
            <div className="h-full rounded-3xl bg-lime p-7 text-ink">
              <MessageCircle size={26} />
              <h3 className="mt-6 text-2xl font-bold">Pedidos direto no WhatsApp</h3>
              <p className="mt-2 text-sm text-ink/75">
                Cada produto e serviço monta automaticamente a mensagem pronta para o cliente
                enviar. Sem formulário, sem fricção.
              </p>
              <div className="mt-6 rounded-2xl bg-ink/90 p-4 text-sm text-ink-foreground">
                “Olá! Tenho interesse no produto <b>Rondelli de funghi</b>, no valor de{" "}
                <b>R$ 68,90</b>.”
              </div>
            </div>
          </Reveal>

          <Reveal className="md:col-span-3" delay={60}>
            <div className="grid h-full gap-4 sm:grid-cols-2">
              {[
                {
                  i: ShoppingBag,
                  t: "Catálogo com variações",
                  d: "Preço, promoção, categoria e disponibilidade.",
                },
                { i: Utensils, t: "Cardápio digital", d: "Seções, adicionais e taxa de entrega." },
                { i: Calendar, t: "Agendamentos", d: "Serviços com duração e profissional." },
                { i: QrCode, t: "QR Code automático", d: "Pronto para imprimir na vitrine." },
              ].map((r) => (
                <div key={r.t} className="rounded-3xl border border-white/12 bg-white/[0.04] p-5">
                  <r.i size={20} className="text-lime" />
                  <h3 className="mt-4 font-semibold">{r.t}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{r.d}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal className="md:col-span-2" delay={100}>
            <div className="h-full rounded-3xl border border-white/12 bg-white/[0.04] p-6">
              <Palette size={20} className="text-lime" />
              <h3 className="mt-4 font-semibold">Identidade própria</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Cores, fontes, bordas, tema claro ou escuro e estilo de botões.
              </p>
              <div className="mt-5 flex gap-2">
                {["#b8ff3c", "#ff4d1c", "#1f7a8c", "#e2b04a", "#d2708f"].map((c) => (
                  <span key={c} className="h-7 w-7 rounded-full" style={{ background: c }} />
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal className="md:col-span-2" delay={140}>
            <div className="h-full rounded-3xl border border-white/12 bg-white/[0.04] p-6">
              <Clock size={20} className="text-lime" />
              <h3 className="mt-4 font-semibold">Aberto ou fechado agora</h3>
              <p className="mt-1 text-sm text-ink-muted">
                O selo muda sozinho conforme os horários cadastrados.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-lime/20 px-3 py-1.5 text-xs font-bold text-lime">
                <span className="h-1.5 w-1.5 rounded-full bg-lime" /> Aberto agora
              </span>
            </div>
          </Reveal>

          <Reveal className="md:col-span-2" delay={180}>
            <div className="h-full rounded-3xl border border-white/12 bg-white/[0.04] p-6">
              <CreditCard size={20} className="text-lime" />
              <h3 className="mt-4 font-semibold">Pix Copia e Cola (em breve)</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Receba sem depender de maquininha ou link externo.
              </p>
              <div className="mt-5 rounded-xl border border-dashed border-white/25 px-3 py-2 font-mono text-[11px] text-ink-muted">
                00020126…5204000053039865802BR
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={220}>
          <div className="mt-8 flex flex-wrap gap-2">
            {recursos.map((r) => (
              <span
                key={r}
                className="rounded-full border border-white/12 px-3 py-1.5 text-xs text-ink-muted"
              >
                {r}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------- MODELOS ------------------------------- */

export function GaleriaModelos({ limite }: { limite?: number }) {
  const [filtro, setFiltro] = useState<string>("todos");
  const lista = modelos.filter((m) => filtro === "todos" || m.segmento === filtro);
  const visiveis = limite ? lista.slice(0, limite) : lista;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {[{ id: "todos", nome: "Todos" }, ...segmentos].map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setFiltro(s.id)}
            aria-pressed={filtro === s.id}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
              filtro === s.id
                ? "border-ink bg-ink text-ink-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            {s.nome}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visiveis.map((m, i) => (
          <Reveal key={m.id} delay={i * 40} className="h-full">
            <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)] focus-within:shadow-[var(--shadow-lift)]">
              <div className="relative h-52 shrink-0 overflow-hidden">
                <img
                  src={m.imagem}
                  alt={`Prévia do modelo ${m.nome}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
                />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/70 p-3 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
                  <Link
                    to="/demonstracao/$modelo"
                    params={{ modelo: m.id }}
                    aria-label={`Visualizar demonstração do modelo ${m.nome}`}
                    className="inline-flex min-h-11 items-center rounded-full bg-card px-4 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                  >
                    Visualizar modelo
                  </Link>
                  <Link
                    to="/painel/novo"
                    search={{ modelo: m.id }}
                    aria-label={`Usar o modelo ${m.nome}`}
                    className="inline-flex min-h-11 items-center rounded-full bg-lime px-4 text-xs font-bold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                  >
                    Usar este modelo
                  </Link>
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <h3 className="min-w-0 font-display text-lg font-bold">{m.nome}</h3>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    {m.destaque}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{m.descricao}</p>
                <div className="mt-4 flex gap-1.5" aria-hidden="true">
                  {Object.values(m.paleta).map((c) => (
                    <span
                      key={c}
                      className="h-4 w-4 rounded-full border border-border"
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </article>
          </Reveal>
        ))}
        <Reveal delay={visiveis.length * 40} className="h-full">
          <article
            aria-labelledby="modelo-ia"
            className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)] focus-within:shadow-[var(--shadow-lift)]"
          >
            <div className="relative grid h-52 shrink-0 place-items-center overflow-hidden bg-ink text-ink-foreground">
              <div
                className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(184,255,60,.26),transparent_48%)] transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
                aria-hidden="true"
              />
              <span
                className="relative grid h-16 w-16 place-items-center rounded-full bg-lime text-ink transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
                aria-hidden="true"
              >
                <Sparkles size={28} />
              </span>
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/70 p-3 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
                <Link
                  to="/demonstracao/ia"
                  aria-label="Ver como funciona a criação automática com IA"
                  className="inline-flex min-h-11 items-center rounded-full bg-card px-4 text-xs font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                >
                  Como funciona
                </Link>
                <Link
                  to="/painel/novo"
                  search={{ modo: "ia" }}
                  aria-label="Criar mini-site com a criação automática de IA"
                  className="inline-flex min-h-11 items-center rounded-full bg-lime px-4 text-xs font-bold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                >
                  Criar com IA
                </Link>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <h3 id="modelo-ia" className="min-w-0 font-display text-lg font-bold">
                  Criação automática com IA
                </h3>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  <Sparkles size={11} aria-hidden="true" /> Feito com IA
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                A IA cria uma primeira versão baseada na descrição, fotos, logo e segmento; você
                pode editar tudo depois.
              </p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {["Descrição", "Logo", "Fotos reais", "Serviços/produtos", "Contato"].map(
                  (item) => (
                    <li
                      key={item}
                      className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground"
                    >
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </article>
        </Reveal>
      </div>
    </div>
  );
}

export function SecaoModelos() {
  return (
    <section id="modelos" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="max-w-2xl text-3xl font-extrabold md:text-5xl">
              Um modelo com a cara de cada segmento.
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Cada modelo tem estrutura, ritmo e seções próprias — não é só troca de cor.
            </p>
          </div>
          <Link
            to="/modelos"
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold hover:bg-secondary"
          >
            Ver galeria completa <ArrowRight size={15} />
          </Link>
        </div>
      </Reveal>
      <div className="mt-10">
        <GaleriaModelos limite={6} />
      </div>
    </section>
  );
}

/* ------------------------------- EDITOR ------------------------------- */

const paletas = [
  { nome: "Lima", primaria: "#b8ff3c", fundo: "#111312", texto: "#f3fff2" },
  { nome: "Âmbar", primaria: "#e2b04a", fundo: "#12100e", texto: "#f7f3ec" },
  { nome: "Areia", primaria: "#c1633f", fundo: "#faf6f1", texto: "#201c18" },
];

export function EditorDemo() {
  const [paleta, setPaleta] = useState(0);
  const [nome, setNome] = useState("Cantina do Vale");
  const [botao, setBotao] = useState<"solido" | "contorno" | "pill">("solido");

  const site = useMemo(() => {
    const base = siteDoModelo("restaurante-moderno");
    const p = paletas[paleta]!;
    return {
      ...base,
      conteudo: { ...base.conteudo, nome },
      aparencia: {
        ...base.aparencia,
        corPrimaria: p.primaria,
        corFundo: p.fundo,
        corTexto: p.texto,
        botao,
      },
    };
  }, [paleta, nome, botao]);

  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <Reveal>
        <h2 className="max-w-2xl text-3xl font-extrabold md:text-5xl">
          Você muda. A página responde na hora.
        </h2>
      </Reveal>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <Reveal>
          <div className="surface p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Informações
            </p>
            <label className="mt-3 block text-sm font-medium">
              Nome do negócio
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Paleta
            </p>
            <div className="mt-3 flex gap-3">
              {paletas.map((p, i) => (
                <button
                  key={p.nome}
                  type="button"
                  onClick={() => setPaleta(i)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${
                    paleta === i ? "border-ink" : "border-border"
                  }`}
                >
                  <span className="h-4 w-4 rounded-full" style={{ background: p.primaria }} />
                  {p.nome}
                </button>
              ))}
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Estilo dos botões
            </p>
            <div className="mt-3 flex gap-2">
              {(["solido", "contorno", "pill"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBotao(b)}
                  className={`rounded-xl border px-3 py-2 text-sm capitalize ${
                    botao === b ? "border-ink bg-ink text-ink-foreground" : "border-border"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              No editor completo você organiza seções arrastando, cadastra produtos, serviços,
              cupons e publica com um clique.
            </p>
            <Link
              to="/painel"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-ink-foreground"
            >
              Abrir o editor <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>

        <Reveal delay={80} className="mx-auto">
          <PhoneFrame largura={300} altura={600}>
            <MiniSite site={site} compacto botaoFlutuante={false} interacoesExternas={false} />
          </PhoneFrame>
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------- POR SEGMENTO --------------------------- */

const porSegmento = [
  {
    id: "restaurantes",
    nome: "Restaurantes",
    itens: [
      "Cardápio",
      "Adicionais",
      "Horário de funcionamento",
      "Pedido pelo WhatsApp",
      "Taxa de entrega",
      "Área de atendimento",
    ],
  },
  {
    id: "beleza",
    nome: "Barbearias e salões",
    itens: ["Serviços", "Profissionais", "Agenda", "Portfólio", "Antes e depois"],
  },
  {
    id: "lojas",
    nome: "Lojas",
    itens: [
      "Catálogo",
      "Variações de produto",
      "Promoções",
      "Pix (em breve)",
      "Pedido pelo WhatsApp",
    ],
  },
  {
    id: "transportadoras",
    nome: "Transportadoras",
    itens: [
      "Solicitação de cotação",
      "Regiões atendidas",
      "Tipos de veículos",
      "Rastreamento (em breve)",
      "Contato comercial",
    ],
  },
  {
    id: "profissionais",
    nome: "Profissionais",
    itens: ["Portfólio", "Serviços", "Currículo", "Depoimentos", "Formulário de orçamento"],
  },
];

export function RecursosPorSegmento() {
  const [ativo, setAtivo] = useState(porSegmento[0]!.id);
  const atual = porSegmento.find((s) => s.id === ativo)!;
  return (
    <section className="border-y border-border bg-sand py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className="max-w-2xl text-3xl font-extrabold md:text-5xl">
            Cada negócio precisa de coisas diferentes.
          </h2>
        </Reveal>
        <div className="mt-8 flex flex-wrap gap-2">
          {porSegmento.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setAtivo(s.id)}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                ativo === s.id ? "border-ink bg-ink text-ink-foreground" : "border-border bg-card"
              }`}
            >
              {s.nome}
            </button>
          ))}
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {atual.itens.map((i) => (
            <div key={i} className="surface flex items-center gap-3 p-4 text-sm font-medium">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-lime/25 text-ink">
                <Check size={15} />
              </span>
              {i}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- ESTATÍSTICAS ----------------------------- */

const serie = Array.from({ length: 14 }, (_, i) => ({
  dia: `${i + 1}`,
  visitas: Math.round(60 + Math.sin(i / 2) * 25 + i * 4),
}));
const origens = [
  { nome: "Instagram", valor: 42 },
  { nome: "WhatsApp", valor: 27 },
  { nome: "Google", valor: 18 },
  { nome: "QR Code", valor: 13 },
];

export function Estatisticas() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <Reveal>
        <h2 className="max-w-2xl text-3xl font-extrabold md:text-5xl">
          Você enxerga o que acontece depois do clique.
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <div className="surface p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Visitas no período</p>
                <p className="font-display text-3xl font-bold">{numero(3428)}</p>
              </div>
              <span className="rounded-full bg-lime/25 px-3 py-1 text-xs font-bold text-ink">
                +18% no mês
              </span>
            </div>
            <div className="mt-6 h-52">
              <GraficoArea
                dados={serie.map((p) => ({ rotulo: p.dia, valor: p.visitas }))}
                ariaLabel="Demonstração de visitas no período"
              />
            </div>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="grid h-full gap-5">
            <div className="surface p-6">
              <p className="text-sm text-muted-foreground">Cliques no WhatsApp</p>
              <p className="font-display text-3xl font-bold">612</p>
              <p className="mt-1 text-xs text-muted-foreground">Taxa de conversão: 17,8%</p>
            </div>
            <div className="surface p-6">
              <p className="text-sm text-muted-foreground">Origem dos visitantes</p>
              <div className="mt-4 h-32">
                <GraficoBarras
                  dados={origens.map((p) => ({ rotulo: p.nome, valor: p.valor }))}
                  ariaLabel="Demonstração das origens dos visitantes"
                />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------- COMO FUNCIONA ---------------------------- */

export function ComoFunciona() {
  const etapas = [
    {
      t: "Escolha um modelo",
      d: "12 modelos com estrutura pensada para cada segmento.",
      i: ImageIcon,
    },
    {
      t: "Personalize o conteúdo",
      d: "Textos, cores, produtos, serviços e links — tudo ao vivo.",
      i: Palette,
    },
    {
      t: "Publique e compartilhe",
      d: "Link curto, QR Code e compartilhamento em um toque.",
      i: Share2,
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 md:pb-28">
      <Reveal>
        <h2 className="text-3xl font-extrabold md:text-5xl">Três passos. Nada além disso.</h2>
      </Reveal>
      <div className="relative mt-12 grid gap-6 md:grid-cols-3">
        <div className="absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
        {etapas.map((e, i) => (
          <Reveal key={e.t} delay={i * 120}>
            <div className="relative">
              <span className="relative z-10 grid h-[72px] w-[72px] place-items-center rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
                <e.i size={24} />
              </span>
              <p className="mt-5 text-sm font-bold text-muted-foreground">0{i + 1}</p>
              <h3 className="mt-1 font-display text-xl font-bold">{e.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{e.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------- PLANOS ------------------------------- */

const planos: {
  nome: string;
  preco: string;
  sufixo?: string;
  selo?: string;
  nota?: string;
  resumo: string;
  destaque?: boolean;
  itens: string[];
}[] = [
  {
    nome: "Essencial",
    preco: "R$ 5",
    sufixo: "no 1º mês",
    selo: "Promoção de estreia",
    nota: "Depois R$ 39/mês nas renovações. O valor de R$ 5 vale apenas para o primeiro mês de novos clientes.",
    resumo: "Para profissionais que precisam centralizar seus contatos.",
    itens: ["Links ilimitados", "WhatsApp e redes sociais", "Horários e localização", "QR Code"],
  },
  {
    nome: "Profissional",
    preco: "R$ 79",
    sufixo: "/mês",
    destaque: true,
    nota: "Cobrança mensal, sem promoção de estreia.",
    resumo: "Para empresas que apresentam serviços e recebem solicitações.",
    itens: [
      "Tudo do Essencial",
      "Serviços e agendamento",
      "Portfólio e depoimentos",
      "Formulário de orçamento",
      "Estatísticas",
    ],
  },
  {
    nome: "Catálogo",
    preco: "R$ 119",
    sufixo: "/mês",
    nota: "Cobrança mensal, sem promoção de estreia.",
    resumo: "Para lojas e restaurantes que divulgam produtos e recebem pedidos.",
    itens: [
      "Tudo do Profissional",
      "Catálogo e cardápio",
      "Cupons e promoções",
      "Pix Copia e Cola (em breve)",
      "Domínio personalizado (em breve)",
    ],
  },
];

export function Planos() {
  return (
    <section id="planos" className="border-y border-border bg-sand py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <h2 className="text-3xl font-extrabold md:text-5xl">Planos demonstrativos</h2>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Valores e recursos ilustrativos — podem ser alterados a qualquer momento antes do
            lançamento comercial.
          </p>
        </Reveal>

        <ul className="mt-10 grid items-stretch gap-5 md:grid-cols-3">
          {planos.map((p, i) => (
            <li key={p.nome} className="h-full">
              <Reveal delay={i * 80} className="h-full">
                <article
                  aria-labelledby={`plano-${p.nome}`}
                  className={`relative flex h-full flex-col rounded-3xl border p-6 transition-shadow sm:p-7 ${
                    p.destaque
                      ? "border-ink bg-ink text-ink-foreground shadow-[var(--shadow-lift)] md:-mt-3 md:pb-9"
                      : "border-border bg-card hover:shadow-[var(--shadow-lift)]"
                  }`}
                >
                  <div className="flex min-h-7 items-start justify-between gap-3">
                    <h3 id={`plano-${p.nome}`} className="font-display text-2xl font-bold">
                      {p.nome}
                    </h3>
                    {p.destaque && (
                      <span className="shrink-0 rounded-full bg-lime px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">
                        Mais escolhido
                      </span>
                    )}
                    {p.selo && (
                      <span className="shrink-0 rounded-full border border-ink px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">
                        {p.selo}
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-2 text-sm ${p.destaque ? "text-ink-muted" : "text-muted-foreground"}`}
                  >
                    {p.resumo}
                  </p>
                  <p className="mt-6 flex flex-wrap items-baseline gap-x-2 font-display text-4xl font-extrabold">
                    {p.preco}
                    {p.sufixo && (
                      <span className="text-base font-semibold opacity-70">{p.sufixo}</span>
                    )}
                  </p>
                  {p.nota && (
                    <p
                      className={`mt-2 rounded-xl px-3 py-2 text-sm font-medium ${
                        p.destaque
                          ? "bg-ink-foreground/10 text-ink-foreground"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      {p.nota}
                    </p>
                  )}
                  <div
                    className={`mt-6 border-t pt-5 ${p.destaque ? "border-ink-foreground/15" : "border-border"}`}
                  >
                    <ul className="space-y-2.5 text-sm">
                      {p.itens.map((it) => (
                        <li key={it} className="flex items-start gap-2">
                          <Check
                            size={16}
                            aria-hidden="true"
                            className={
                              p.destaque ? "mt-0.5 shrink-0 text-lime" : "mt-0.5 shrink-0 text-ink"
                            }
                          />
                          <span className="min-w-0">{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-auto pt-7">
                    <Link
                      to="/painel/meu-plano"
                      aria-label={`Assinar o plano ${p.nome}`}
                      className={`inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transform-none ${
                        p.destaque ? "bg-lime text-ink" : "bg-ink text-ink-foreground"
                      }`}
                    >
                      Assinar agora
                    </Link>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
          A promoção de R$ 5 no primeiro mês é válida apenas para novos clientes no plano Essencial.
          A partir da segunda cobrança, o valor é R$ 39/mês. Profissional (R$ 79/mês) e Catálogo (R$
          119/mês) não têm promoção de estreia.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------- FAQ -------------------------------- */

const duvidasDe = (nome: string) => [
  {
    p: "Preciso ter um site?",
    r: `Não. O ${nome} cria a página completa para você — ela já é o seu site.`,
  },
  {
    p: "Posso usar meu próprio domínio?",
    r: "Ainda não por cliente. O domínio personalizado está identificado como uma integração futura no painel.",
  },
  {
    p: "Funciona no celular?",
    r: "Todos os modelos são feitos primeiro para o celular, onde a maioria dos clientes acessa.",
  },
  {
    p: "Posso receber pedidos pelo WhatsApp?",
    r: "Sim. Cada produto ou serviço gera automaticamente a mensagem pronta.",
  },
  {
    p: "É possível alterar o conteúdo depois?",
    r: "Sempre. O editor mostra as mudanças na hora e publica com um clique.",
  },
  {
    p: "Consigo acompanhar os acessos?",
    r: "Sim, com visitas, cliques no WhatsApp, origens e horários de maior movimento.",
  },
  {
    p: "Preciso instalar algum aplicativo?",
    r: "Nenhum. Tudo funciona pelo navegador, no computador ou no celular.",
  },
];

export function Duvidas() {
  const marca = useMarca();
  const [aberta, setAberta] = useState<number | null>(0);
  return (
    <section id="duvidas" className="mx-auto max-w-3xl px-5 py-20 md:py-28">
      <Reveal>
        <h2 className="text-3xl font-extrabold md:text-5xl">Perguntas frequentes</h2>
      </Reveal>
      <div className="mt-10 divide-y divide-border border-y border-border">
        {duvidasDe(marca.nome).map((d, i) => (
          <div key={d.p}>
            <button
              type="button"
              onClick={() => setAberta(aberta === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="font-display text-lg font-semibold">{d.p}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 transition-transform ${aberta === i ? "rotate-180" : ""}`}
              />
            </button>
            {aberta === i && <p className="pb-5 text-muted-foreground">{d.r}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ CTA FINAL ------------------------------ */

export function CtaFinal() {
  const marca = useMarca();
  return (
    <section className="grain bg-ink py-24 text-ink-foreground">
      <div className="mx-auto max-w-3xl px-5 text-center">
        <Reveal>
          <h2 className="text-3xl font-extrabold md:text-5xl">
            Seu próximo cliente pode estar a um clique de distância.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-ink-muted">
            Reúna tudo o que seu negócio oferece em uma experiência bonita, rápida e fácil de
            compartilhar.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              to="/modelos"
              className="rounded-full bg-lime px-6 py-3.5 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5"
            >
              Explorar modelos
            </Link>
            <a
              href={whatsappLink(
                marca.whatsappComercial,
                `Olá! Gostaria de uma demonstração do ${marca.nome}.`,
              )}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/25 px-6 py-3.5 text-sm font-semibold"
            >
              Solicitar demonstração
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------- RODAPÉ ------------------------------- */

export function SiteFooter() {
  const marca = useMarca();
  const colunas = [
    { titulo: "Produto", itens: ["Recursos", "Modelos", "Planos"] },
    { titulo: "Segmentos", itens: ["Alimentação", "Beleza", "Comércio", "Serviços"] },
    { titulo: "Suporte", itens: ["Central de ajuda", "Termos de uso", "Privacidade"] },
  ];
  return (
    <footer className="border-t border-border bg-background py-14">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">{marca.slogan}.</p>
          <div className="mt-5 flex gap-3">
            <a
              href={`https://instagram.com/${marca.instagram}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="grid h-10 w-10 place-items-center rounded-full border border-border hover:bg-secondary"
            >
              <Instagram size={16} />
            </a>
            <a
              href={whatsappLink(marca.whatsappComercial, "Olá!")}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="grid h-10 w-10 place-items-center rounded-full border border-border hover:bg-secondary"
            >
              <MessageCircle size={16} />
            </a>
          </div>
        </div>
        {colunas.map((c) => (
          <div key={c.titulo}>
            <p className="text-sm font-bold">{c.titulo}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {c.itens.map((i) => (
                <li key={i}>
                  {i === "Termos de uso" ? (
                    <Link to="/termos" className="transition-colors hover:text-foreground">
                      {i}
                    </Link>
                  ) : i === "Privacidade" ? (
                    <Link to="/privacidade" className="transition-colors hover:text-foreground">
                      {i}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toast("Recurso disponível em breve")}
                      className="transition-colors hover:text-foreground"
                    >
                      {i}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} {marca.nome}. Todos os direitos reservados.
        </p>
        <p className="inline-flex items-center gap-1.5">
          <MapPin size={12} /> Feito no Brasil
        </p>
      </div>
    </footer>
  );
}

export const IconesInfo = { Globe, Star };
