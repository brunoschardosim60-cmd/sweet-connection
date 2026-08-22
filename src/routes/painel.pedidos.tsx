import { useCallback, useEffect, useMemo, useState } from "react";
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
import { QRCodeSVG } from "qrcode.react";
import { useNexa } from "@/lib/nexa/hooks";
import { copiarTexto, enderecoSite } from "@/lib/nexa/clipboard";
import { rotulosModalidade, rotulosPagamento, type Modalidade } from "@/lib/nexa/catalogo";
import { moeda } from "@/lib/nexa/utils";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

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

/** Área operacional do Cardápio Digital, com pedidos e mesas persistidos no Supabase. */
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
        Pedidos confirmados pelo Cardápio Digital aparecem aqui em tempo real. Dados de contato
        ficam visíveis apenas ao dono deste mini-site.
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

      {aba === "pedidos" && <AbaPedidos siteId={site?.id} />}
      {aba === "mesas" && (
        <AbaMesas siteId={site?.id} slug={site?.slug} nome={site?.conteudo.nome} />
      )}
      {aba === "operacao" && <AbaOperacao siteId={site?.id} />}
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

type Pedido = {
  id: string;
  codigo: number;
  status: string;
  modalidade: string;
  nome: string;
  telefone: string;
  total: number;
  pagamento: string | null;
  mesa_id: string | null;
  created_at: string;
  itens: { nome: string; quantidade: number }[];
};
function AbaPedidos({ siteId }: { siteId?: string | undefined }) {
  const [status, setStatus] = useState<string>("todos");
  const [tipo, setTipo] = useState<string>("todos");
  const [periodo, setPeriodo] = useState("hoje");
  const [pagamento, setPagamento] = useState("todos");
  const [mesa, setMesa] = useState("");
  const [busca, setBusca] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const carregar = async () => {
    if (!siteId) {
      setPedidos([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const { data } = await supabase
      .from("pedidos_cardapio")
      .select("id,codigo,status,modalidade,nome,telefone,total,pagamento,mesa_id,created_at,itens")
      .eq("minisite_id", siteId)
      .order("created_at", { ascending: false });
    setPedidos((data ?? []) as unknown as Pedido[]);
    setCarregando(false);
  };
  useEffect(() => {
    void carregar();
    // carregar is intentionally recreated with the selected site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);
  const visiveis = pedidos.filter(
    (p) =>
      (status === "todos" ||
        p.status ===
          status
            .replace("novos", "novo")
            .replace("prontos", "pronto")
            .replace("concluidos", "concluido")
            .replace("cancelados", "cancelado")
            .replace("rota", "em_rota")) &&
      (tipo === "todos" || p.modalidade === tipo) &&
      (pagamento === "todos" || p.pagamento === pagamento) &&
      `${p.codigo} ${p.nome} ${p.telefone}`.toLowerCase().includes(busca.toLowerCase()),
  );
  const mudarStatus = async (id: string, novo: string) => {
    const { error } = await supabase.rpc("nexa_atualizar_status_pedido", {
      requested_id: id,
      requested_status: novo,
    });
    if (!error) void carregar();
    else toast.error("Não foi possível atualizar o pedido.");
  };

  return (
    <section aria-label="Lista de pedidos" className="space-y-4">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statusPedido.map((s) => (
          <li key={s.id} className="surface p-3">
            <p className="text-xs text-muted-foreground">{s.rotulo}</p>
            <p className="font-display text-2xl font-bold">
              {
                pedidos.filter(
                  (p) =>
                    p.status ===
                    s.id
                      .replace("novos", "novo")
                      .replace("prontos", "pronto")
                      .replace("concluidos", "concluido")
                      .replace("cancelados", "cancelado")
                      .replace("rota", "em_rota"),
                ).length
              }
            </p>
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
              className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground"
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
              className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground"
            >
              <option value="hoje">Hoje</option>
              <option value="7">7 dias</option>
              <option value="30">30 dias</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </Campo>
          <Campo rotulo="Tipo">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground"
            >
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
              className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground"
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
              className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground"
            />
          </Campo>
        </div>
      </div>

      {carregando ? (
        <div className="space-y-3" aria-busy="true" aria-label="Carregando pedidos">
          {[0, 1, 2].map((item) => (
            <div key={item} className="surface space-y-3 p-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : visiveis.length === 0 ? (
        <div className="surface grid place-items-center gap-2 px-4 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary">
            <Utensils size={20} className="text-muted-foreground" aria-hidden />
          </span>
          <p className="font-semibold">Nenhum pedido recebido nesta tela</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Nenhum pedido corresponde aos filtros selecionados.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visiveis.map((p) => (
            <li
              key={p.id}
              className="surface flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-semibold">
                  #{p.codigo} · {p.nome}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rotulosModalidade[p.modalidade as Modalidade] ?? p.modalidade} · {p.telefone} ·{" "}
                  {new Date(p.created_at).toLocaleString("pt-BR")}
                </p>
                <p className="mt-1 text-xs">
                  {p.itens.map((i) => `${i.quantidade}× ${i.nome}`).join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <strong>{moeda(p.total)}</strong>
                <select
                  aria-label={`Status do pedido ${p.codigo}`}
                  value={p.status}
                  onChange={(e) => void mudarStatus(p.id, e.target.value)}
                  className="min-h-11 rounded-xl border border-border bg-card px-3 text-xs"
                >
                  {["novo", "aceito", "preparo", "pronto", "em_rota", "concluido", "cancelado"].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s.replaceAll("_", " ")}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}

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

const estadosMesa = [
  { id: "livre", rotulo: "Livre", cor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  { id: "ocupada", rotulo: "Ocupada", cor: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  {
    id: "aguardando",
    rotulo: "Aguardando pedido",
    cor: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  {
    id: "atendimento",
    rotulo: "Em atendimento",
    cor: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
] as const;

function AbaMesas({
  siteId,
  slug,
  nome,
}: {
  siteId?: string | undefined;
  slug?: string | undefined;
  nome?: string | undefined;
}) {
  type Mesa = { id: string; numero: number; nome: string | null; estado: string; ativa: boolean };
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [novaMesa, setNovaMesa] = useState("1");
  const [carregando, setCarregando] = useState(false);
  const carregar = useCallback(async () => {
    if (!siteId) return;
    setCarregando(true);
    const { data, error } = await supabase
      .from("mesas_cardapio")
      .select("id,numero,nome,estado,ativa")
      .eq("minisite_id", siteId)
      .order("numero");
    if (error) toast.error("Não foi possível carregar as mesas.");
    else setMesas(data ?? []);
    setCarregando(false);
  }, [siteId]);
  useEffect(() => {
    void carregar();
  }, [carregar]);
  const criarMesa = async () => {
    const numero = Number(novaMesa);
    if (!siteId || !Number.isInteger(numero) || numero < 1 || numero > 200) {
      toast.error("Informe um número entre 1 e 200.");
      return;
    }
    const { error } = await supabase.from("mesas_cardapio").insert({ minisite_id: siteId, numero });
    if (error) {
      toast.error(
        error.code === "23505" ? "Esta mesa já existe." : "Não foi possível cadastrar a mesa.",
      );
      return;
    }
    setNovaMesa(String(numero + 1));
    void carregar();
  };
  const atualizarMesa = async (
    mesa: Mesa,
    dados: Partial<Pick<Mesa, "estado" | "ativa" | "nome">>,
  ) => {
    const { error } = await supabase.from("mesas_cardapio").update(dados).eq("id", mesa.id);
    if (error) toast.error("Não foi possível salvar a mesa.");
    else void carregar();
  };

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
              Nova mesa
              <input
                type="number"
                min={1}
                max={200}
                value={novaMesa}
                onChange={(e) => setNovaMesa(e.target.value)}
                className="mt-1 block min-h-11 w-28 rounded-xl border border-border bg-card px-3 text-sm text-foreground"
              />
            </label>
            <button
              type="button"
              onClick={() => void criarMesa()}
              className="min-h-11 rounded-full bg-ink px-4 text-xs font-semibold text-ink-foreground"
            >
              Cadastrar mesa
            </button>
            <p className="flex-1 text-xs text-muted-foreground">
              Mesas, estados e links ficam salvos para {nome}. O QR Code abre o cardápio já
              vinculado à mesa.
            </p>
          </div>

          <ul className="flex flex-wrap gap-2" aria-label="Legenda de estados das mesas">
            {estadosMesa.map((e) => (
              <li
                key={e.id}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold ${e.cor}`}
              >
                {e.rotulo}
              </li>
            ))}
            <li>
              <Etiqueta />
            </li>
          </ul>

          {carregando ? (
            <p className="text-sm text-muted-foreground">Carregando mesas…</p>
          ) : mesas.length === 0 ? (
            <p className="surface p-6 text-sm text-muted-foreground">
              Nenhuma mesa cadastrada ainda.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mesas.map((mesa) => (
                <li key={mesa.id} className="surface space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-lg font-bold">Mesa {mesa.numero}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        estadosMesa.find((e) => e.id === mesa.estado)?.cor ?? ""
                      }`}
                    >
                      {estadosMesa.find((e) => e.id === mesa.estado)?.rotulo ?? mesa.estado}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {enderecoSite(slug)}/cardapio?mesa={mesa.numero}
                  </p>
                  <label className="block text-[11px] text-muted-foreground">
                    Estado
                    <select
                      value={mesa.estado}
                      onChange={(e) => void atualizarMesa(mesa, { estado: e.target.value })}
                      className="mt-1 min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground"
                    >
                      {estadosMesa.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.rotulo}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copiar(mesa.numero)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-xs font-semibold text-ink-foreground"
                    >
                      <Copy size={14} aria-hidden /> Copiar link
                    </button>
                    <details className="rounded-xl border border-border p-2">
                      <summary className="cursor-pointer text-xs font-semibold">
                        <QrCode size={14} className="mr-1 inline" aria-hidden /> QR Code
                      </summary>
                      <QRCodeSVG
                        className="mt-2"
                        value={`${enderecoSite(slug)}/cardapio?mesa=${mesa.numero}`}
                        size={144}
                      />
                    </details>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function AbaOperacao({ siteId }: { siteId?: string | undefined }) {
  const [periodo, setPeriodo] = useState("hoje");
  const [pedidos, setPedidos] = useState<
    { total: number; modalidade: string; created_at: string }[]
  >([]);
  useEffect(() => {
    if (!siteId) {
      setPedidos([]);
      return;
    }
    void supabase
      .from("pedidos_cardapio")
      .select("total,modalidade,created_at")
      .eq("minisite_id", siteId)
      .neq("status", "cancelado")
      .then(({ data }) =>
        setPedidos((data ?? []) as { total: number; modalidade: string; created_at: string }[]),
      );
  }, [siteId]);
  const limite = periodo === "hoje" ? 1 : Number(periodo);
  const recentes = pedidos.filter(
    (p) => Date.now() - new Date(p.created_at).getTime() <= limite * 86400000,
  );
  const total = recentes.reduce((s, p) => s + p.total, 0);
  const metricas = [
    { rotulo: "Faturamento", valor: moeda(total) },
    { rotulo: "Pedidos", valor: String(recentes.length) },
    { rotulo: "Ticket médio", valor: moeda(recentes.length ? total / recentes.length : 0) },
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
          <option value="90">90 dias</option>
        </select>
        <Etiqueta />
      </div>

      <ul className="grid gap-3 sm:grid-cols-3">
        {metricas.map((m) => (
          <li key={m.rotulo} className="surface p-4">
            <p className="text-xs text-muted-foreground">{m.rotulo}</p>
            <p className="font-display text-2xl font-bold">{m.valor}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Dados de pedidos confirmados</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-3 lg:grid-cols-3">
        {["Itens mais pedidos", "Horários de maior movimento", "Pedidos por modalidade"].map(
          (t) => (
            <div key={t} className="surface grid min-h-40 place-items-center gap-1 p-4 text-center">
              <p className="text-sm font-semibold">{t}</p>
              <p className="text-xs text-muted-foreground">
                Sem dados ainda. Nenhum número é estimado aqui.
              </p>
            </div>
          ),
        )}
      </div>
    </section>
  );
}
