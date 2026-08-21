import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  Clock,
  Copy,
  Info,
  QrCode,
  Search,
  Store,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { useNexa } from "@/lib/nexa/hooks";
import { copiarTexto, enderecoSite } from "@/lib/nexa/clipboard";
import { rotulosModalidade, rotulosPagamento, type Modalidade } from "@/lib/nexa/catalogo";
import { moeda } from "@/lib/nexa/utils";

export const Route = createFileRoute("/painel/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos — Nexa" },
      {
        name: "description",
        content: "Acompanhe pedidos de entrega, retirada e mesa do seu cardápio digital.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PainelPedidos,
});

type Aba = "pedidos" | "mesas" | "operacao";

const statusPedido = [
  { id: "novos", rotulo: "Novos" },
  { id: "preparo", rotulo: "Em preparo" },
  { id: "prontos", rotulo: "Prontos" },
  { id: "rota", rotulo: "Em rota" },
  { id: "concluidos", rotulo: "Concluídos" },
  { id: "cancelados", rotulo: "Cancelados" },
] as const;

const acoesStatus = [
  "Aceitar",
  "Em preparo",
  "Pronto",
  "Saiu para entrega",
  "Concluído",
  "Cancelar",
];

/**
 * Área operacional do Cardápio Digital. Os pedidos ainda não são persistidos:
 * toda a tela mostra estados vazios honestos e ações marcadas como
 * "Disponível após ativação" até a operação ser conectada.
 */
function PainelPedidos() {
  const { sites, pronto } = useNexa();
  const [aba, setAba] = useState<Aba>("pedidos");

  const sitesCardapio = useMemo(
    () => sites.filter((s) => s.produtos.length > 0 || s.modeloId.startsWith("cardapio-")),
    [sites],
  );
  const [siteId, setSiteId] = useState<string>("");
  const site = sitesCardapio.find((s) => s.id === siteId) ?? sitesCardapio[0];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            Operação do Cardápio Digital: entrega, retirada e mesa em um só lugar.
          </p>
        </div>
        {sitesCardapio.length > 1 && (
          <label className="text-xs font-medium text-muted-foreground">
            Mini-site
            <select
              value={site?.id ?? ""}
              onChange={(e) => setSiteId(e.target.value)}
              className="mt-1 block min-h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground"
            >
              {sitesCardapio.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.conteudo.nome}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      <Aviso>
        Os pedidos enviados pelo cardápio chegam hoje no WhatsApp do estabelecimento. O recebimento
        automático nesta tela fica <strong>disponível após a ativação da operação</strong> — nada
        aqui inventa pedidos ou valores.
      </Aviso>

      <div role="tablist" aria-label="Áreas de pedidos" className="flex flex-wrap gap-2">
        {(
          [
            { id: "pedidos", rotulo: "Pedidos", icone: ClipboardList },
            { id: "mesas", rotulo: "Mesas e QR Code", icone: QrCode },
            { id: "operacao", rotulo: "Operação", icone: TrendingUp },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={aba === t.id}
            onClick={() => setAba(t.id)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
              aba === t.id
                ? "border-ink bg-ink text-ink-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            <t.icone size={15} aria-hidden /> {t.rotulo}
          </button>
        ))}
      </div>

      {!pronto && <p className="text-sm text-muted-foreground">Carregando seus mini-sites…</p>}

      {aba === "pedidos" && <AbaPedidos />}
      {aba === "mesas" && <AbaMesas slug={site?.slug} nome={site?.conteudo.nome} />}
      {aba === "operacao" && <AbaOperacao />}
    </div>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-2xl border border-border bg-secondary/60 p-3 text-xs text-muted-foreground">
      <Info size={15} className="mt-0.5 shrink-0" aria-hidden /> <span>{children}</span>
    </p>
  );
}

function Etiqueta() {
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
      Disponível após ativação
    </span>
  );
}

function AbaPedidos() {
  const [status, setStatus] = useState<string>("todos");
  const [tipo, setTipo] = useState<string>("todos");
  const [periodo, setPeriodo] = useState("hoje");
  const [pagamento, setPagamento] = useState("todos");
  const [mesa, setMesa] = useState("");
  const [busca, setBusca] = useState("");

  return (
    <section aria-label="Lista de pedidos" className="space-y-4">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statusPedido.map((s) => (
          <li key={s.id} className="surface p-3">
            <p className="text-xs text-muted-foreground">{s.rotulo}</p>
            <p className="font-display text-2xl font-bold">0</p>
          </li>
        ))}
      </ul>

      <div className="surface space-y-3 p-4">
        <div className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-3">
          <Search size={15} className="text-muted-foreground" aria-hidden />
          <label className="sr-only" htmlFor="busca-pedidos">
            Buscar por nome, número do pedido ou telefone
          </label>
          <input
            id="busca-pedidos"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, número do pedido ou telefone"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Campo rotulo="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="entrada-filtro"
            >
              <option value="todos">Todos</option>
              {statusPedido.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.rotulo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Período">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="entrada-filtro"
            >
              <option value="hoje">Hoje</option>
              <option value="7">7 dias</option>
              <option value="30">30 dias</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </Campo>
          <Campo rotulo="Tipo">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="entrada-filtro">
              <option value="todos">Todos</option>
              {(Object.keys(rotulosModalidade) as Modalidade[]).map((m) => (
                <option key={m} value={m}>
                  {rotulosModalidade[m]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Pagamento">
            <select
              value={pagamento}
              onChange={(e) => setPagamento(e.target.value)}
              className="entrada-filtro"
            >
              <option value="todos">Todos</option>
              {Object.entries(rotulosPagamento).map(([id, rotulo]) => (
                <option key={id} value={id}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Mesa">
            <input
              value={mesa}
              onChange={(e) => setMesa(e.target.value)}
              placeholder="Ex.: 12"
              className="entrada-filtro"
            />
          </Campo>
        </div>
      </div>

      <div className="surface grid place-items-center gap-2 px-4 py-12 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary">
          <Utensils size={20} className="text-muted-foreground" aria-hidden />
        </span>
        <p className="font-semibold">Nenhum pedido recebido nesta tela</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Os pedidos do cardápio seguem para o WhatsApp do estabelecimento. Assim que a operação for
          ativada, eles aparecem aqui com código, horário, itens, cliente e histórico de status.
        </p>
      </div>

      <div className="surface space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-base font-bold">Ações de status do pedido</h2>
          <Etiqueta />
        </div>
        <p className="text-xs text-muted-foreground">
          Fluxo previsto para cada pedido. Os botões ficam ativos quando os pedidos passarem a ser
          registrados — nada é salvo hoje.
        </p>
        <div className="flex flex-wrap gap-2">
          {acoesStatus.map((a) => (
            <button
              key={a}
              type="button"
              disabled
              className="min-h-11 cursor-not-allowed rounded-full border border-dashed border-border px-4 text-xs font-semibold text-muted-foreground"
            >
              {a}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">
      {rotulo}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function AbaMesas({ slug, nome }: { slug?: string; nome?: string }) {
  const [quantidade, setQuantidade] = useState(6);
  const mesas = Array.from({ length: Math.min(Math.max(quantidade, 1), 40) }, (_, i) => i + 1);

  const copiar = async (numero: number) => {
    if (!slug) return;
    const link = `${enderecoSite(slug)}/cardapio?mesa=${numero}`;
    const ok = await copiarTexto(link);
    toast[ok ? "success" : "error"](
      ok ? `Link da mesa ${numero} copiado` : "Não foi possível copiar o link",
    );
  };

  return (
    <section aria-label="Mesas e QR Code" className="space-y-4">
      {!slug ? (
        <div className="surface grid place-items-center gap-2 px-4 py-12 text-center">
          <Store size={20} className="text-muted-foreground" aria-hidden />
          <p className="font-semibold">Nenhum mini-site com cardápio ainda</p>
          <Link
            to="/painel/novo"
            className="mt-2 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-ink-foreground"
          >
            Criar cardápio digital
          </Link>
        </div>
      ) : (
        <>
          <div className="surface flex flex-wrap items-end gap-3 p-4">
            <label className="text-xs font-medium text-muted-foreground">
              Mesas do salão (pré-visualização)
              <input
                type="number"
                min={1}
                max={40}
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value) || 1)}
                className="mt-1 block min-h-11 w-28 rounded-xl border border-border bg-card px-3 text-sm text-foreground"
              />
            </label>
            <p className="flex-1 text-xs text-muted-foreground">
              A quantidade acima só organiza esta visualização. O cadastro permanente de mesas,
              estado (livre, ocupada, aguardando pedido, em atendimento) e pedidos ativos fica{" "}
              <strong>disponível após a ativação</strong>. Os links abaixo, porém, são reais e já
              abrem o cardápio de {nome}.
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mesas.map((n) => (
              <li key={n} className="surface space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-lg font-bold">Mesa {n}</p>
                  <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Estado após ativação
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {enderecoSite(slug)}/cardapio?mesa={n}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copiar(n)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-xs font-semibold text-ink-foreground"
                  >
                    <Copy size={14} aria-hidden /> Copiar link da mesa
                  </button>
                  <button
                    type="button"
                    disabled
                    className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-full border border-dashed border-border px-4 text-xs font-semibold text-muted-foreground"
                  >
                    <QrCode size={14} aria-hidden /> QR Code
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function AbaOperacao() {
  const [periodo, setPeriodo] = useState("hoje");
  const metricas = [
    { rotulo: "Faturamento", valor: moeda(0) },
    { rotulo: "Pedidos", valor: "0" },
    { rotulo: "Ticket médio", valor: moeda(0) },
  ];

  return (
    <section aria-label="Visão de operação" className="space-y-4">
      <div className="surface flex flex-wrap items-center gap-2 p-3">
        <Clock size={15} className="text-muted-foreground" aria-hidden />
        <label className="sr-only" htmlFor="periodo-operacao">
          Período
        </label>
        <select
          id="periodo-operacao"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm"
        >
          <option value="hoje">Hoje</option>
          <option value="7">7 dias</option>
          <option value="30">30 dias</option>
          <option value="personalizado">Período personalizado</option>
        </select>
        <Etiqueta />
      </div>

      <ul className="grid gap-3 sm:grid-cols-3">
        {metricas.map((m) => (
          <li key={m.rotulo} className="surface p-4">
            <p className="text-xs text-muted-foreground">{m.rotulo}</p>
            <p className="font-display text-2xl font-bold">{m.valor}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Sem pedidos registrados</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-3 lg:grid-cols-3">
        {["Itens mais pedidos", "Horários de maior movimento", "Pedidos por modalidade"].map((t) => (
          <div key={t} className="surface grid min-h-40 place-items-center gap-1 p-4 text-center">
            <p className="text-sm font-semibold">{t}</p>
            <p className="text-xs text-muted-foreground">
              Sem dados ainda. Nenhum número é estimado aqui.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
