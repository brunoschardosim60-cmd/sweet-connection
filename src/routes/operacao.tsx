import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Copy,
  ExternalLink,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  RefreshCw,
  Store,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthSession } from "@/hooks/use-auth-session";
import { supabase } from "@/integrations/supabase/client";
import { moeda } from "@/lib/nexa/utils";
import { whatsappLink } from "@/lib/nexa/brand";
import { ConvitesLoja, EntregarLoja } from "@/components/operacao/EntregaLoja";

export const Route = createFileRoute("/operacao")({
  validateSearch: (s: Record<string, unknown>): { site?: string } =>
    typeof s["site"] === "string" && /^[\da-f-]{36}$/i.test(s["site"]) ? { site: s["site"] } : {},
  head: () => ({
    meta: [{ title: "Operação da loja — Nexa" }, { name: "robots", content: "noindex" }],
  }),
  component: Operacao,
});
type Loja = { id: string; nome: string; slug: string; dono: boolean; publicado: boolean };
type Item = {
  nome: string;
  quantidade: number;
  observacao?: string;
  preco?: number;
  precoUnitario?: number;
  opcoes?: { nome?: string; grupoNome?: string; opcaoNome?: string }[];
};
type Pedido = {
  id: string;
  codigo: number;
  status: string;
  modalidade: string;
  nome: string;
  telefone: string;
  itens: Item[];
  total: number;
  subtotal: number;
  taxa_entrega: number;
  pagamento: string;
  troco: number | null;
  endereco: string;
  bairro: string;
  complemento: string;
  referencia: string;
  observacao: string;
  horario_preferido: string;
  agendado_para: string | null;
  created_at: string;
};
type Agenda = {
  id: string;
  data: string;
  hora: string;
  nome: string;
  telefone: string;
  servico: string;
  observacao: string;
  status: string;
};
type Solicitacao = {
  id: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
};
type Dados = {
  pedidos: Pedido[];
  agenda: Agenda[];
  solicitacoes: Solicitacao[];
  estatisticas: {
    visitas: number;
    cliques: number;
    whatsapp: number;
    pedidos: number;
    concluidos: number;
    receita: number;
  };
  fuso: string;
};
type Acesso = { id: string; email: string };
const botao =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50";
const campo =
  "min-h-11 min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring";
const rotulos: Record<string, string> = {
  novo: "Aguardando aceite",
  aceito: "Aceito",
  preparo: "Em preparo",
  pronto: "Pronto",
  em_rota: "Saiu para entrega",
  concluido: "Concluído",
  cancelado: "Cancelado",
  entrega: "Entrega",
  retirada: "Retirada",
  mesa: "Mesa / comanda",
  confirmado: "Confirmado",
  reagendado: "Reagendado",
  pendente: "Pendente",
};
function Carregando() {
  return (
    <div role="status" className="grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />
      ))}
      <span className="sr-only">Carregando operação</span>
    </div>
  );
}
function vazio(texto: string) {
  return (
    <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
      <div className="max-w-md space-y-2">
        <ClipboardList className="mx-auto text-muted-foreground" aria-hidden="true" />
        <p className="font-semibold text-foreground">Tudo organizado por aqui</p>
        <p className="text-sm text-muted-foreground">{texto}</p>
      </div>
    </div>
  );
}
const nomeCampo = (chave: string) =>
  ({
    nome: "Nome",
    email: "E-mail",
    telefone: "Telefone",
    whatsapp: "WhatsApp",
    mensagem: "Mensagem",
    observacao: "Observação",
    servico: "Serviço",
    data: "Data",
    horario: "Horário",
    assunto: "Assunto",
  })[chave.toLocaleLowerCase("pt-BR")] ??
  chave.replaceAll("_", " ").replace(/^./, (letra) => letra.toLocaleUpperCase("pt-BR"));

function valorSolicitacao(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "Não informado";
  if (Array.isArray(valor)) return valor.map(valorSolicitacao).join(", ");
  if (typeof valor === "object")
    return Object.entries(valor as Record<string, unknown>)
      .map(([chave, item]) => `${nomeCampo(chave)}: ${valorSolicitacao(item)}`)
      .join(" · ");
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  return String(valor);
}
function erroOperacao(error: unknown) {
  const mensagem = (error as { message?: string })?.message ?? "";
  if (mensagem.includes("registered_account_required"))
    return "Essa pessoa precisa criar uma conta Nexa e confirmar o e-mail primeiro.";
  if (mensagem.includes("already_owner")) return "Você já é o proprietário desta loja.";
  if (mensagem.includes("access_limit")) return "Limite de 20 pessoas por loja atingido.";
  if (mensagem.includes("invalid_transition"))
    return "O pedido mudou. Atualize e siga a próxima etapa disponível.";
  if (mensagem.includes("not_allowed"))
    return "Você não tem mais acesso a esta loja. Peça ao proprietário para revisar seu acesso.";
  if (mensagem.includes("duplicate") || mensagem.includes("unique"))
    return "Esse horário já está ocupado.";
  return "Não foi possível concluir. Atualize os dados e tente novamente.";
}
function Operacao() {
  const { user, carregando } = useAuthSession();
  const { site } = Route.useSearch();
  const navigate = useNavigate();
  const lojas = useQuery({
    queryKey: ["operacao-lojas", user?.id],
    enabled: !!user,
    gcTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const r = await supabase.rpc("nexa_operacao_sites");
      if (r.error) throw r.error;
      return r.data as unknown as Loja[];
    },
  });
  const selecionada =
    lojas.data?.find((l) => l.id === site) ?? (!site ? lojas.data?.[0] : undefined);
  if (carregando)
    return (
      <main className="mx-auto max-w-6xl p-6">
        <Carregando />
      </main>
    );
  if (!user) {
    const retorno = `/operacao${site ? `?site=${site}` : ""}`;
    return (
      <main className="mx-auto max-w-lg space-y-5 px-6 py-20">
        <Store size={36} />
        <h1 className="text-3xl font-bold">Operação da loja</h1>
        <p className="text-muted-foreground">
          Entre com a conta autorizada pelo proprietário para acompanhar pedidos, agenda,
          solicitações e resultados. Você terá acesso somente aos estabelecimentos compartilhados
          com você.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/login"
            search={{ retorno }}
            className={`${botao} bg-primary text-primary-foreground`}
          >
            Entrar
          </Link>
          <Link to="/cadastro" search={{ retorno }} className={botao}>
            Criar conta
          </Link>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-ink text-ink-foreground">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:flex sm:px-6">
          <div className="flex min-w-0 items-center gap-3 sm:mr-auto">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-lime text-accent-foreground">
              <Store size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold sm:text-xl">Operação das lojas</h1>
              <p className="truncate text-xs text-ink-muted">Ambiente exclusivo de atendimento</p>
            </div>
          </div>
          {lojas.data?.some((l) => l.dono) && (
            <Link
              to="/painel"
              className={`${botao} border-sidebar-border bg-sidebar-accent px-3 text-sidebar-foreground`}
            >
              <ExternalLink size={15} aria-hidden="true" />
              <span className="hidden sm:inline">Ir para criação</span>
              <span className="sr-only sm:hidden">Ir para criação do site</span>
            </Link>
          )}
          <button
            className={`${botao} border-sidebar-border bg-sidebar-accent text-sidebar-foreground`}
            onClick={() => void supabase.auth.signOut()}
          >
            <LogOut size={16} />
            <span className="sr-only sm:not-sr-only">Sair</span>
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
        <ConvitesLoja usuario={user.id} />
        {lojas.isPending ? (
          <Carregando />
        ) : lojas.isError ? (
          <div role="alert">
            Não foi possível carregar seus estabelecimentos.{" "}
            <button className={botao} onClick={() => void lojas.refetch()}>
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            <section className="grid gap-4 rounded-xl border border-border bg-card p-4 shadow-soft sm:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)] sm:items-center sm:p-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-muted-foreground">
                  Estabelecimento em atendimento
                </p>
                <p className="mt-1 truncate text-lg font-bold">
                  {selecionada?.nome ?? "Selecione uma loja"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pedidos, agenda e resultados sempre seguem esta seleção.
                </p>
              </div>
              <label className="block min-w-0 text-sm font-semibold">
                Trocar estabelecimento
                <select
                  aria-label="Estabelecimento em atendimento"
                  className={`${campo} mt-1 block w-full`}
                  value={selecionada?.id ?? ""}
                  onChange={(e) =>
                    void navigate({ to: "/operacao", search: { site: e.target.value } })
                  }
                >
                  <option value="" disabled>
                    Selecione uma loja
                  </option>
                  {lojas.data.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome}
                      {l.dono ? " — proprietário" : " — equipe"}
                    </option>
                  ))}
                </select>
              </label>
            </section>
            {selecionada ? (
              <AreaLoja key={`${user.id}:${selecionada.id}`} loja={selecionada} usuario={user.id} />
            ) : (
              vazio(
                site
                  ? "Este estabelecimento não está disponível para sua conta. Selecione uma loja autorizada ou peça acesso ao proprietário."
                  : "Nenhum estabelecimento compartilhado com você. Peça ao proprietário para adicionar seu e-mail na aba Equipe e acessos.",
              )
            )}
          </>
        )}
      </div>
    </main>
  );
}
function AreaLoja({ loja, usuario }: { loja: Loja; usuario: string }) {
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [aba, setAba] = useState("Pedidos");
  const [filtro, setFiltro] = useState("ativos");
  const [som, setSom] = useState(false);
  const vistos = useRef<Set<string> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["operacao-dados", usuario, loja.id],
    gcTime: 0,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
    retry: 1,
    queryFn: async () => {
      const r = await supabase.rpc("nexa_operacao_dados", { site_id: loja.id });
      if (r.error) throw r.error;
      return r.data as unknown as Dados;
    },
  });
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  useEffect(() => {
    if (!q.data || q.isError) return;
    const novos = q.data.pedidos.filter(
      (p) => p.status === "novo" && vistos.current && !vistos.current.has(p.id),
    );
    if (novos.length) {
      toast.info(`${novos.length} novo(s) pedido(s) em ${loja.nome}`, { duration: 8000 });
      if (som && audio.current) {
        const ctx = audio.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 740;
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    }
    vistos.current = new Set(q.data.pedidos.map((p) => p.id));
  }, [q.data, q.isError, loja.nome, som]);
  const executar = async (chave: string, acao: () => PromiseLike<{ error: unknown }>) => {
    if (ocupado) return;
    setOcupado(chave);
    try {
      const r = await acao();
      if (r.error) throw r.error;
      await q.refetch();
      toast.success("Atualizado");
    } catch (error) {
      toast.error(erroOperacao(error));
      await q.refetch();
    } finally {
      setOcupado(null);
    }
  };
  const data = (instante: string) =>
    new Date(instante).toLocaleString("pt-BR", {
      timeZone: q.data?.fuso ?? "America/Sao_Paulo",
      dateStyle: "short",
      timeStyle: "short",
    });
  if (q.isPending) return <Carregando />;
  if (q.isError || !q.data)
    return (
      <div role="alert" className="space-y-4 rounded-2xl border border-border p-6">
        <p>{erroOperacao(q.error)}</p>
        <button className={botao} onClick={() => void q.refetch()}>
          Atualizar acesso
        </button>
      </div>
    );
  const dados = q.data;
  const pedidos = dados.pedidos
    .filter(
      (p) =>
        filtro === "todos" ||
        (filtro === "ativos"
          ? !["concluido", "cancelado"].includes(p.status)
          : p.status === filtro),
    )
    .sort(
      (a, b) =>
        Number(b.status === "novo") - Number(a.status === "novo") ||
        (a.agendado_para ?? a.created_at).localeCompare(b.agendado_para ?? b.created_at),
    );
  const contagens = {
    ativos: dados.pedidos.filter((p) => !["concluido", "cancelado"].includes(p.status)).length,
    novo: dados.pedidos.filter((p) => p.status === "novo").length,
    concluido: dados.pedidos.filter((p) => p.status === "concluido").length,
    cancelado: dados.pedidos.filter((p) => p.status === "cancelado").length,
    todos: dados.pedidos.length,
  };
  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0" aria-live="polite">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="truncate text-2xl font-bold sm:text-3xl">{loja.nome}</h2>
            <span className="shrink-0 rounded-full bg-lime-soft px-2.5 py-1 text-xs font-bold text-accent-foreground">
              Loja selecionada
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {loja.publicado ? "Publicada" : "Não publicada"} · Horário de{" "}
            {dados.fuso.replace("America/", "").replaceAll("_", " ")} · Atualiza a cada 15 s
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            className={`${botao} px-3`}
            aria-label={som ? "Desativar som de novos pedidos" : "Ativar som de novos pedidos"}
            aria-pressed={som}
            onClick={async () => {
              try {
                if (!som) {
                  audio.current ??= new AudioContext();
                  await audio.current.resume();
                }
                setSom(!som);
              } catch {
                toast.error("O navegador não permitiu ativar o som.");
              }
            }}
          >
            <Bell size={16} />
            <span className="hidden md:inline">{som ? "Som ativo" : "Ativar som"}</span>
          </button>
          <button
            className={`${botao} px-3`}
            aria-label="Atualizar dados agora"
            disabled={q.isFetching}
            onClick={() => void q.refetch()}
          >
            <RefreshCw size={16} className={q.isFetching ? "animate-spin" : ""} />
            <span className="hidden md:inline">Atualizar</span>
          </button>
        </div>
      </div>
      <nav
        role="tablist"
        aria-label="Área de operação"
        className="scrollbar-invisivel -mx-4 flex gap-1 overflow-x-auto border-y border-border bg-card px-4 py-2 sm:mx-0 sm:rounded-lg sm:border sm:px-2"
      >
        {[
          "Pedidos",
          "Agenda",
          "Solicitações",
          "Estatísticas",
          ...(loja.dono ? ["Equipe e acessos"] : []),
        ].map((a) => (
          <button
            key={a}
            id={`aba-${a}`}
            role="tab"
            aria-controls={`painel-${a}`}
            aria-selected={aba === a}
            className={`min-h-11 shrink-0 rounded-md px-3 text-sm font-semibold transition-colors ${aba === a ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            onClick={() => setAba(a)}
          >
            {a}
            {a === "Pedidos" && dados.pedidos.some((p) => p.status === "novo") && (
              <span
                aria-label={`${contagens.novo} pedidos aguardando aceite`}
                className="rounded-full bg-background px-2 text-foreground"
              >
                {dados.pedidos.filter((p) => p.status === "novo").length}
              </span>
            )}
          </button>
        ))}
      </nav>
      {aba === "Pedidos" && (
        <div
          role="tabpanel"
          id="painel-Pedidos"
          aria-labelledby="aba-Pedidos"
          className="space-y-4"
        >
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-bold">Pedidos</h3>
              <p className="text-xs text-muted-foreground">
                Até 500 pedidos mais recentes desta loja
              </p>
            </div>
            <div
              className="scrollbar-invisivel -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
              aria-label="Filtrar pedidos"
            >
              {(
                [
                  ["ativos", "Em atendimento"],
                  ["novo", "Aguardando"],
                  ["concluido", "Concluídos"],
                  ["cancelado", "Cancelados"],
                  ["todos", "Todos"],
                ] as const
              ).map(([valor, rotulo]) => (
                <button
                  key={valor}
                  aria-pressed={filtro === valor}
                  onClick={() => setFiltro(valor)}
                  className={`min-h-11 shrink-0 rounded-lg border px-3 text-sm font-semibold ${filtro === valor ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
                >
                  {rotulo} <span className="ml-1 tabular-nums opacity-70">{contagens[valor]}</span>
                </button>
              ))}
            </div>
          </div>
          {!pedidos.length ? (
            vazio("Nenhum pedido nesta etapa. Novos pedidos aparecerão aqui.")
          ) : (
            <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {pedidos.map((p) => (
                <FichaPedido
                  key={p.id}
                  pedido={p}
                  data={data}
                  ocupado={ocupado === `pedido:${p.id}`}
                  atualizar={(status) =>
                    executar(`pedido:${p.id}`, () =>
                      supabase.rpc("nexa_atualizar_status_pedido", {
                        requested_id: p.id,
                        requested_status: status,
                      }),
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
      {aba === "Agenda" && (
        <div role="tabpanel" id="painel-Agenda" aria-labelledby="aba-Agenda" className="space-y-4">
          <div>
            <h3 className="text-lg font-bold">Agenda da loja</h3>
            <p className="text-sm text-muted-foreground">
              Datas e horários no fuso de {dados.fuso.replace("America/", "").replaceAll("_", " ")}{" "}
              · até 500 agendamentos
            </p>
          </div>
          {!dados.agenda.length ? (
            vazio("Nenhum agendamento recebido.")
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {dados.agenda.map((a) => (
                <FichaAgenda
                  key={a.id}
                  agenda={a}
                  ocupado={ocupado === `agenda:${a.id}`}
                  atualizar={(estado, dia, hora) =>
                    executar(`agenda:${a.id}`, () =>
                      supabase.rpc("nexa_operacao_atualizar", {
                        site_id: loja.id,
                        tipo: "agenda",
                        alvo: a.id,
                        estado,
                        ...(dia ? { dia } : {}),
                        ...(hora ? { hora } : {}),
                      }),
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
      {aba === "Solicitações" && (
        <div
          role="tabpanel"
          id="painel-Solicitações"
          aria-labelledby="aba-Solicitações"
          className="space-y-4"
        >
          <div>
            <h3 className="text-lg font-bold">Solicitações</h3>
            <p className="text-sm text-muted-foreground">
              Mensagens recebidas por {loja.nome} · até 500 mais recentes
            </p>
          </div>
          {!dados.solicitacoes.length ? (
            vazio("Nenhuma solicitação recebida.")
          ) : (
            <div className="grid items-start gap-4 md:grid-cols-2">
              {dados.solicitacoes.map((s) => (
                <article
                  key={s.id}
                  className={`space-y-4 rounded-xl border bg-card p-4 sm:p-5 ${s.status === "novo" ? "border-primary shadow-soft" : "border-border"}`}
                >
                  <div className="flex justify-between gap-3 text-sm">
                    <strong className="flex items-center gap-2">
                      {s.status === "novo" && (
                        <span className="size-2 rounded-full bg-lime" aria-hidden="true" />
                      )}
                      {s.status === "novo"
                        ? "Nova solicitação"
                        : s.status === "lido"
                          ? "Lida"
                          : "Arquivada"}
                    </strong>
                    <time className="shrink-0 text-xs text-muted-foreground">
                      {data(s.created_at)}
                    </time>
                  </div>
                  <dl className="space-y-2 text-sm">
                    {Object.entries(s.payload).map(([k, v]) => (
                      <div
                        key={k}
                        className="break-words border-b border-border pb-2 last:border-0"
                      >
                        <dt className="text-xs font-semibold text-muted-foreground">
                          {nomeCampo(k)}
                        </dt>
                        <dd className="mt-0.5 whitespace-pre-wrap">{valorSolicitacao(v)}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    {s.status !== "lido" && (
                      <button
                        className={botao}
                        disabled={ocupado === `solicitacao:${s.id}`}
                        onClick={() =>
                          void executar(`solicitacao:${s.id}`, () =>
                            supabase.rpc("nexa_operacao_atualizar", {
                              site_id: loja.id,
                              tipo: "solicitacao",
                              alvo: s.id,
                              estado: "lido",
                            }),
                          )
                        }
                      >
                        Marcar como lida
                      </button>
                    )}
                    {s.status !== "arquivado" && (
                      <button
                        className={botao}
                        disabled={ocupado === `solicitacao:${s.id}`}
                        onClick={() =>
                          void executar(`solicitacao:${s.id}`, () =>
                            supabase.rpc("nexa_operacao_atualizar", {
                              site_id: loja.id,
                              tipo: "solicitacao",
                              alvo: s.id,
                              estado: "arquivado",
                            }),
                          )
                        }
                      >
                        Arquivar
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
      {aba === "Estatísticas" && (
        <section
          role="tabpanel"
          id="painel-Estatísticas"
          aria-labelledby="aba-Estatísticas"
          className="space-y-5"
        >
          <div>
            <h3 className="text-lg font-bold">Resultados de {loja.nome}</h3>
            <p className="text-sm text-muted-foreground">
              Período: últimos 30 dias · somente este estabelecimento
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Visitas", dados.estatisticas.visitas],
              ["Cliques", dados.estatisticas.cliques],
              ["Contatos pelo WhatsApp", dados.estatisticas.whatsapp],
              ["Pedidos recebidos", dados.estatisticas.pedidos],
              ["Pedidos concluídos", dados.estatisticas.concluidos],
              ["Valor dos pedidos concluídos", moeda(dados.estatisticas.receita)],
            ].map(([nome, valor]) => (
              <div key={nome} className="rounded-xl border border-border bg-card p-5 shadow-soft">
                <p className="text-sm text-muted-foreground">{nome}</p>
                <strong className="mt-2 block text-3xl tabular-nums">{valor}</strong>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border bg-muted p-4 text-sm">
            <strong>Sobre o valor exibido</strong>
            <p className="mt-1 text-muted-foreground">
              É a soma dos pedidos marcados como concluídos, não uma confirmação de pagamento
              recebido. O recebimento continua sob controle do estabelecimento.
            </p>
          </div>
        </section>
      )}
      {aba === "Equipe e acessos" && loja.dono && (
        <>
          <Equipe loja={loja} usuario={usuario} />
          <EntregarLoja siteId={loja.id} nome={loja.nome} />
        </>
      )}
      {!loja.dono && (
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Você é colaborador desta loja. Sair remove somente seu acesso, sem fechar a loja.
          </p>
          <button
            className={`${botao} mt-2 text-destructive`}
            onClick={async () => {
              if (!confirmarSaida) {
                setConfirmarSaida(true);
                return;
              }
              const r = await supabase.rpc("nexa_operacao_sair", { site_id: loja.id });
              if (r.error) toast.error(erroOperacao(r.error));
              else window.location.assign("/operacao");
            }}
          >
            {confirmarSaida ? "Confirmar saída desta loja" : "Sair da equipe desta loja"}
          </button>
          {confirmarSaida && (
            <button className={`${botao} ml-2`} onClick={() => setConfirmarSaida(false)}>
              Cancelar
            </button>
          )}
        </div>
      )}
    </>
  );
}
function FichaPedido({
  pedido: p,
  data,
  ocupado,
  atualizar,
}: {
  pedido: Pedido;
  data: (d: string) => string;
  ocupado: boolean;
  atualizar: (s: string) => Promise<void>;
}) {
  const [checados, setChecados] = useState<number[]>([]);
  const [cancelar, setCancelar] = useState(false);
  const proximo = (
    {
      novo: ["aceito", "Aceitar pedido"],
      aceito: ["preparo", "Iniciar preparo"],
      preparo: ["pronto", "Marcar como pronto"],
      pronto:
        p.modalidade === "entrega"
          ? ["em_rota", "Saiu para entrega"]
          : ["concluido", "Concluir retirada / atendimento"],
      em_rota: ["concluido", "Concluir entrega"],
    } as Record<string, string[]>
  )[p.status];
  const proximoStatus = proximo?.[0];
  const proximoRotulo = proximo?.[1];
  return (
    <article
      className={`min-w-0 overflow-hidden rounded-xl border bg-card shadow-soft ${p.status === "novo" ? "border-primary" : "border-border"}`}
    >
      <header
        className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b p-4 sm:p-5 ${p.status === "novo" ? "border-primary bg-lime-soft/60" : "border-border bg-muted/40"}`}
      >
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-xl font-bold">
            <ClipboardList size={18} />
            Pedido #{p.codigo}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <time>{data(p.created_at)}</time>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-foreground">
              {rotulos[p.modalidade] ?? p.modalidade}
            </span>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold">
          {rotulos[p.status] ?? p.status}
        </span>
      </header>
      <div className="space-y-4 p-4 sm:p-5">
        {p.agendado_para ? (
          <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary p-3 text-sm">
            <CalendarDays className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
            <div>
              <strong className="block">Pedido agendado</strong>
              <time>{data(p.agendado_para)}</time>
            </div>
          </div>
        ) : (
          <p className="text-xs font-bold uppercase text-muted-foreground">Atendimento imediato</p>
        )}
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="min-w-0">
            <span className="text-xs text-muted-foreground">Cliente</span>
            <p className="truncate font-bold">{p.nome}</p>
          </div>
          <a
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-border px-3 font-semibold hover:bg-muted"
            href={whatsappLink(
              p.telefone,
              `Olá, ${p.nome}. Vamos falar sobre seu pedido #${p.codigo}.`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={16} /> Contatar
          </a>
        </div>
        <section aria-label="Itens para preparar">
          <h4 className="mb-2 text-xs font-bold uppercase text-muted-foreground">Preparo</h4>
          <ul className="divide-y divide-border rounded-lg border border-border px-3">
            {p.itens.map((item, i) => (
              <li key={i} className="py-3">
                <label className="flex min-h-11 cursor-pointer items-start gap-3">
                  <input
                    className="mt-0.5 size-6 shrink-0 accent-primary"
                    type="checkbox"
                    checked={checados.includes(i)}
                    onChange={(e) =>
                      setChecados((v) => (e.target.checked ? [...v, i] : v.filter((j) => j !== i)))
                    }
                  />
                  <span
                    className={`min-w-0 break-words text-sm ${checados.includes(i) ? "text-muted-foreground line-through" : ""}`}
                  >
                    <strong>
                      {item.quantidade}× {item.nome}
                    </strong>
                    {item.opcoes?.map((o, j) => (
                      <span key={j} className="mt-0.5 block text-xs text-muted-foreground">
                        {[o.grupoNome, o.opcaoNome ?? o.nome].filter(Boolean).join(": ")}
                      </span>
                    ))}
                    {item.observacao && (
                      <span className="mt-2 block rounded-md bg-lime-soft p-2 font-semibold no-underline">
                        Observação do item: {item.observacao}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">
            Checks são auxiliares neste dispositivo; não alteram o pedido.
          </p>
        </section>
        {p.endereco && (
          <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm">
            <MapPin className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
            <div>
              <strong className="block">Endereço de entrega</strong>
              <p className="break-words">
                {[p.endereco, p.bairro, p.complemento, p.referencia].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        )}
        {(p.observacao || p.horario_preferido) && (
          <div className="break-words rounded-lg border border-primary bg-lime-soft/50 p-3 text-sm">
            <strong className="block">Atenção no pedido</strong>
            {p.observacao && <p className="mt-1">{p.observacao}</p>}
            {p.horario_preferido && (
              <p className="mt-1">Horário preferido: {p.horario_preferido}</p>
            )}
          </div>
        )}
        <div className="rounded-lg border border-border p-3 text-sm">
          <div className="flex justify-between gap-2">
            <span>Itens</span>
            <span>{moeda(p.subtotal)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Entrega</span>
            <span>{moeda(p.taxa_entrega)}</span>
          </div>
          <div className="mt-2 flex justify-between gap-2 text-lg font-bold">
            <span>Total</span>
            <span>{moeda(p.total)}</span>
          </div>
          <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
            Pagamento informado: {p.pagamento}
            {p.troco ? ` · Troco para ${moeda(p.troco)}` : ""}
          </p>
        </div>
        {proximoStatus && proximoRotulo && (
          <div className="space-y-2 border-t border-border pt-4">
            <button
              disabled={ocupado}
              className={`${botao} w-full border-primary bg-primary text-primary-foreground hover:bg-primary/90`}
              onClick={() => void atualizar(proximoStatus)}
            >
              {ocupado ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
              {proximoRotulo} <ChevronRight size={16} />
            </button>
            {cancelar ? (
              <div
                role="alert"
                className="space-y-3 rounded-lg border border-destructive/40 p-3 text-sm"
              >
                <p>Cancelar este pedido? O cliente verá o cancelamento no acompanhamento.</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={ocupado}
                    className={`${botao} border-destructive text-destructive`}
                    onClick={() => void atualizar("cancelado")}
                  >
                    Confirmar cancelamento
                  </button>
                  <button className={botao} onClick={() => setCancelar(false)}>
                    Voltar
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="min-h-11 w-full text-sm font-semibold text-destructive"
                onClick={() => setCancelar(true)}
              >
                Recusar / cancelar pedido
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
function FichaAgenda({
  agenda: a,
  ocupado,
  atualizar,
}: {
  agenda: Agenda;
  ocupado: boolean;
  atualizar: (estado: string, dia?: string, hora?: string) => Promise<void>;
}) {
  const [editar, setEditar] = useState(false),
    [dia, setDia] = useState(a.data),
    [hora, setHora] = useState(a.hora),
    [cancelar, setCancelar] = useState(false);
  return (
    <article className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-muted-foreground">Data e horário</p>
          <h3 className="mt-1 text-xl font-bold">
            {a.data.split("-").reverse().join("/")}{" "}
            <span className="text-muted-foreground">às</span> {a.hora}
          </h3>
        </div>
        <span className="h-fit rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold">
          {rotulos[a.status] ?? a.status}
        </span>
      </header>
      <div>
        <p className="font-bold">{a.nome}</p>
        <p className="text-sm text-muted-foreground">{a.servico || "Serviço não informado"}</p>
      </div>
      {a.observacao && (
        <div className="break-words rounded-lg bg-lime-soft/50 p-3 text-sm">
          <strong className="block">Observação</strong>
          {a.observacao}
        </div>
      )}
      <a
        className={botao}
        href={whatsappLink(a.telefone, "Olá! Vamos falar sobre seu agendamento.")}
        target="_blank"
        rel="noreferrer"
      >
        Contatar cliente
      </a>
      {a.status === "confirmado" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button className={botao} onClick={() => setEditar(!editar)}>
              Reagendar
            </button>
            <button className={`${botao} text-destructive`} onClick={() => setCancelar(!cancelar)}>
              Cancelar
            </button>
          </div>
          {editar && (
            <form
              className="grid gap-3 rounded-lg border border-border bg-muted/40 p-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void atualizar("reagendar", dia, hora);
              }}
            >
              <input
                aria-label="Nova data"
                className={campo}
                type="date"
                required
                value={dia}
                onChange={(e) => setDia(e.target.value)}
              />
              <input
                aria-label="Novo horário"
                className={campo}
                type="time"
                required
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
              <button
                className={`${botao} bg-primary text-primary-foreground sm:col-span-2`}
                disabled={ocupado}
              >
                Salvar horário
              </button>
            </form>
          )}
          {cancelar && (
            <button
              className={`${botao} text-destructive`}
              disabled={ocupado}
              onClick={() => void atualizar("cancelado")}
            >
              Confirmar cancelamento do agendamento
            </button>
          )}
        </>
      )}
    </article>
  );
}
function Equipe({ loja, usuario }: { loja: Loja; usuario: string }) {
  const [email, setEmail] = useState(""),
    [ocupado, setOcupado] = useState(false),
    [revogar, setRevogar] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["operacao-acessos", usuario, loja.id],
    gcTime: 0,
    queryFn: async () => {
      const r = await supabase.rpc("nexa_operacao_acessos", { site_id: loja.id });
      if (r.error) throw r.error;
      return r.data as unknown as Acesso[];
    },
  });
  const alterar = async (dados: { email?: string; remover?: string }) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      const r = await supabase.rpc("nexa_operacao_acessos", { site_id: loja.id, ...dados });
      if (r.error) throw r.error;
      setEmail("");
      setRevogar(null);
      await q.refetch();
      toast.success(dados.remover ? "Acesso revogado" : "Acesso concedido a esta loja");
    } catch (e) {
      toast.error(erroOperacao(e));
    } finally {
      setOcupado(false);
    }
  };
  return (
    <section
      role="tabpanel"
      id="painel-Equipe e acessos"
      aria-labelledby="aba-Equipe e acessos"
      className="max-w-3xl space-y-6"
    >
      <div>
        <h3 className="text-xl font-bold">Equipe e acessos</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Compartilhe o atendimento sem liberar a criação do site.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <p className="text-sm text-muted-foreground">
          Compartilhe somente a operação de <strong>{loja.nome}</strong>. A pessoa poderá atender
          pedidos, gerenciar agenda e solicitações e consultar estatísticas. Não poderá editar o
          site, administrar acessos ou ver suas outras empresas.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            "A pessoa cria a conta Nexa e confirma o e-mail.",
            "Você adiciona o mesmo e-mail abaixo.",
            "Depois, envia o link da operação.",
          ].map((passo, i) => (
            <div key={passo} className="rounded-lg bg-muted p-3 text-sm">
              <strong className="mb-1 block">Passo {i + 1}</strong>
              {passo}
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h4 className="font-bold">Adicionar uma pessoa</h4>
        <p className="mt-1 text-sm text-muted-foreground">
          Ela verá apenas a operação de {loja.nome}. A conta precisa estar cadastrada e com o e-mail
          confirmado.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void alterar({ email });
          }}
          className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
        >
          <input
            aria-label="E-mail da pessoa"
            className={`${campo} w-full`}
            type="email"
            required
            maxLength={254}
            value={email}
            placeholder="equipe@empresa.com"
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className={`${botao} bg-primary text-primary-foreground`} disabled={ocupado}>
            {ocupado ? <Loader2 className="animate-spin" size={16} /> : null}Conceder acesso
          </button>
        </form>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h4 className="font-bold">Link de acesso à operação</h4>
        <p className="mt-1 text-sm text-muted-foreground">
          Copiar e enviar o link não concede acesso. Somente e-mails autorizados acima conseguem
          entrar.
        </p>
        <button
          className={`${botao} mt-4`}
          onClick={() => {
            void navigator.clipboard
              .writeText(`${window.location.origin}/operacao?site=${loja.id}`)
              .then(
                () => toast.success("Link copiado"),
                () => toast.error("Não foi possível copiar. Use o endereço desta página."),
              );
          }}
        >
          <Copy size={16} /> Copiar link da operação
        </button>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <Users size={18} />
          <h4 className="font-bold">Pessoas autorizadas</h4>
        </div>
        {q.isPending ? (
          <Carregando />
        ) : q.isError ? (
          <p role="alert">
            Não foi possível carregar os acessos.{" "}
            <button className={botao} onClick={() => void q.refetch()}>
              Tentar novamente
            </button>
          </p>
        ) : !q.data.length ? (
          vazio("Somente você tem acesso. Nenhuma pessoa adicionada.")
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {q.data.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="break-all text-sm">{a.email}</span>
                <button
                  className={`${botao} text-destructive`}
                  disabled={ocupado}
                  onClick={() =>
                    revogar === a.id ? void alterar({ remover: a.id }) : setRevogar(a.id)
                  }
                >
                  {revogar === a.id ? "Confirmar revogação" : "Revogar acesso"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
