import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Check, ClipboardList, Loader2, LogOut, RefreshCw, Store } from "lucide-react";
import { toast } from "sonner";
import { useAuthSession } from "@/hooks/use-auth-session";
import { supabase } from "@/integrations/supabase/client";
import { moeda } from "@/lib/nexa/utils";
import { whatsappLink } from "@/lib/nexa/brand";

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
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium disabled:opacity-50";
const campo = "min-h-11 min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm";
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
    <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
      {texto}
    </div>
  );
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
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
          <Store className="text-primary" />
          <div className="mr-auto">
            <h1 className="text-xl font-bold">Operação da loja</h1>
            <p className="text-xs text-muted-foreground">
              Atendimento separado da criação de sites
            </p>
          </div>
          {lojas.data?.some((l) => l.dono) && (
            <Link to="/painel" className={botao}>
              Área de criação
            </Link>
          )}
          <button className={botao} onClick={() => void supabase.auth.signOut()}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
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
            <label className="block max-w-lg space-y-2 text-sm font-medium">
              Estabelecimento
              <select
                aria-label="Estabelecimento"
                className={`${campo} block w-full`}
                value={selecionada?.id ?? ""}
                onChange={(e) => {
                  window.location.assign(`/operacao?site=${e.target.value}`);
                }}
              >
                <option value="" disabled>
                  Selecione uma loja
                </option>
                {lojas.data.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome} — /{l.slug}
                    {l.dono ? " (proprietário)" : ""}
                  </option>
                ))}
              </select>
            </label>
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
  const [aba, setAba] = useState("Pedidos");
  const [filtro, setFiltro] = useState("ativos");
  const [som, setSom] = useState(false);
  const vistos = useRef<Set<string> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const [ocupado, setOcupado] = useState(false);
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
  const executar = async (acao: () => PromiseLike<{ error: unknown }>) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      const r = await acao();
      if (r.error) throw r.error;
      await q.refetch();
      toast.success("Atualizado");
    } catch (error) {
      toast.error(erroOperacao(error));
      await q.refetch();
    } finally {
      setOcupado(false);
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
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-2xl font-bold">{loja.nome}</h2>
          <p className="text-xs text-muted-foreground">
            {loja.publicado ? "Loja publicada" : "Loja não publicada"} · Atualização a cada 15
            segundos · {dados.fuso.replace("America/", "").replaceAll("_", " ")}
          </p>
        </div>
        <button
          className={botao}
          aria-pressed={som}
          onClick={async () => {
            if (!som) {
              audio.current ??= new AudioContext();
              await audio.current.resume();
            }
            setSom(!som);
          }}
        >
          <Bell size={16} />
          {som ? "Som ativado" : "Ativar som"}
        </button>
        <button className={botao} disabled={q.isFetching} onClick={() => void q.refetch()}>
          <RefreshCw size={16} className={q.isFetching ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>
      <nav aria-label="Área de operação" className="flex flex-wrap gap-2">
        {[
          "Pedidos",
          "Agenda",
          "Solicitações",
          "Estatísticas",
          ...(loja.dono ? ["Equipe e acessos"] : []),
        ].map((a) => (
          <button
            key={a}
            className={`${botao} ${aba === a ? "bg-primary text-primary-foreground" : "bg-card"}`}
            aria-current={aba === a ? "page" : undefined}
            onClick={() => setAba(a)}
          >
            {a}
            {a === "Pedidos" && dados.pedidos.some((p) => p.status === "novo") && (
              <span className="rounded-full bg-background px-2 text-foreground">
                {dados.pedidos.filter((p) => p.status === "novo").length}
              </span>
            )}
          </button>
        ))}
      </nav>
      {aba === "Pedidos" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm">
              Exibir{" "}
              <select
                className={`${campo} ml-2`}
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              >
                <option value="ativos">Em atendimento</option>
                <option value="novo">Aguardando aceite</option>
                <option value="concluido">Concluídos</option>
                <option value="cancelado">Cancelados</option>
                <option value="todos">Todos</option>
              </select>
            </label>
            <p className="text-xs text-muted-foreground">
              {pedidos.length} pedido(s) · Até 500 mais recentes
            </p>
          </div>
          {!pedidos.length ? (
            vazio("Nenhum pedido nesta etapa. Novos pedidos aparecerão aqui.")
          ) : (
            <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pedidos.map((p) => (
                <FichaPedido
                  key={p.id}
                  pedido={p}
                  data={data}
                  ocupado={ocupado}
                  atualizar={(status) =>
                    executar(() =>
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
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Horários locais da loja · Até 500 agendamentos mais recentes
          </p>
          {!dados.agenda.length ? (
            vazio("Nenhum agendamento recebido.")
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {dados.agenda.map((a) => (
                <FichaAgenda
                  key={a.id}
                  agenda={a}
                  ocupado={ocupado}
                  atualizar={(estado, dia, hora) =>
                    executar(() =>
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
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Até 500 solicitações mais recentes · Somente desta loja
          </p>
          {!dados.solicitacoes.length ? (
            vazio("Nenhuma solicitação recebida.")
          ) : (
            <div className="grid items-start gap-4 md:grid-cols-2">
              {dados.solicitacoes.map((s) => (
                <article
                  key={s.id}
                  className="space-y-3 rounded-2xl border border-border bg-card p-5"
                >
                  <div className="flex justify-between gap-3 text-sm">
                    <strong>
                      {s.status === "novo"
                        ? "Nova solicitação"
                        : s.status === "lido"
                          ? "Lida"
                          : "Arquivada"}
                    </strong>
                    <time>{data(s.created_at)}</time>
                  </div>
                  <dl className="space-y-2 text-sm">
                    {Object.entries(s.payload).map(([k, v]) => (
                      <div key={k} className="break-words">
                        <dt className="text-xs text-muted-foreground">{k}</dt>
                        <dd>{typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    {s.status !== "lido" && (
                      <button
                        className={botao}
                        disabled={ocupado}
                        onClick={() =>
                          void executar(() =>
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
                        disabled={ocupado}
                        onClick={() =>
                          void executar(() =>
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
        <section className="space-y-5">
          <h3 className="font-semibold">Resultados desta loja — últimos 30 dias</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Visitas", dados.estatisticas.visitas],
              ["Cliques", dados.estatisticas.cliques],
              ["Contatos pelo WhatsApp", dados.estatisticas.whatsapp],
              ["Pedidos recebidos", dados.estatisticas.pedidos],
              ["Pedidos concluídos", dados.estatisticas.concluidos],
              ["Valor dos pedidos concluídos", moeda(dados.estatisticas.receita)],
            ].map(([nome, valor]) => (
              <div key={nome} className="rounded-2xl border border-border bg-card p-6">
                <p className="text-sm text-muted-foreground">{nome}</p>
                <strong className="mt-2 block text-3xl tabular-nums">{valor}</strong>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Valores dos pedidos não comprovam pagamento. O recebimento é controlado pelo
            estabelecimento.
          </p>
        </section>
      )}
      {aba === "Equipe e acessos" && loja.dono && <Equipe loja={loja} usuario={usuario} />}
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
  return (
    <article
      className={`min-w-0 space-y-4 rounded-2xl border border-border border-t-4 bg-card p-5 ${p.status === "novo" ? "border-t-amber-500" : "border-t-primary/40"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <ClipboardList size={18} />
            Pedido #{p.codigo}
          </h3>
          <time className="text-xs text-muted-foreground">{data(p.created_at)}</time>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
          {rotulos[p.status] ?? p.status}
        </span>
      </div>
      {p.agendado_para && (
        <p className="rounded-xl bg-primary/10 p-3 text-sm font-semibold">
          Agendado: {data(p.agendado_para)}
        </p>
      )}
      <p className="break-words text-sm">
        <strong>{p.nome}</strong> · {rotulos[p.modalidade] ?? p.modalidade}
      </p>
      <ul className="divide-y divide-border border-y border-border">
        {p.itens.map((item, i) => (
          <li key={i} className="py-3">
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input
                className="mt-1 size-5 shrink-0 accent-primary"
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
                {item.observacao && (
                  <span className="mt-1 block font-medium">Obs.: {item.observacao}</span>
                )}
                {item.opcoes?.map((o, j) => (
                  <span key={j} className="block text-xs">
                    {[o.grupoNome, o.opcaoNome ?? o.nome].filter(Boolean).join(": ")}
                  </span>
                ))}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">
        Checks são auxiliares neste dispositivo; não alteram o pedido.
      </p>
      {p.endereco && (
        <p className="break-words text-sm">
          <strong>Endereço:</strong>{" "}
          {[p.endereco, p.bairro, p.complemento, p.referencia].filter(Boolean).join(" · ")}
        </p>
      )}
      {(p.observacao || p.horario_preferido) && (
        <p className="break-words rounded-xl bg-muted p-3 text-sm">
          {[p.observacao, p.horario_preferido].filter(Boolean).join(" · ")}
        </p>
      )}
      <div className="text-sm">
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
        <p className="mt-2 text-xs text-muted-foreground">
          Pagamento combinado: {p.pagamento}
          {p.troco ? ` · Troco para ${moeda(p.troco)}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          className={botao}
          href={whatsappLink(
            p.telefone,
            `Olá, ${p.nome}. Vamos falar sobre seu pedido #${p.codigo}.`,
          )}
          target="_blank"
          rel="noreferrer"
        >
          Contatar cliente
        </a>
        {proximo && (
          <button
            disabled={ocupado}
            className={`${botao} bg-primary text-primary-foreground`}
            onClick={() => void atualizar(proximo[0]!)}
          >
            <Check size={16} />
            {proximo[1]}
          </button>
        )}
      </div>
      {proximo && (
        <div>
          {cancelar ? (
            <div className="space-y-2 rounded-xl border border-destructive/40 p-3 text-sm">
              <p>Cancelar este pedido? O cliente verá o cancelamento no acompanhamento.</p>
              <div className="flex gap-2">
                <button
                  disabled={ocupado}
                  className={`${botao} text-destructive`}
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
            <button className="min-h-11 text-xs text-destructive" onClick={() => setCancelar(true)}>
              Recusar / cancelar pedido
            </button>
          )}
        </div>
      )}
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
    <article className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h3 className="font-bold">
        {a.data.split("-").reverse().join("/")} · {a.hora}
      </h3>
      <p className="text-sm">
        {a.nome} · {a.servico}
      </p>
      <p className="text-xs text-muted-foreground">{a.status}</p>
      {a.observacao && <p className="break-words text-sm">{a.observacao}</p>}
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
          <div className="flex flex-wrap gap-2">
            <button className={botao} onClick={() => setEditar(!editar)}>
              Reagendar
            </button>
            <button className={`${botao} text-destructive`} onClick={() => setCancelar(!cancelar)}>
              Cancelar
            </button>
          </div>
          {editar && (
            <form
              className="flex flex-wrap gap-2"
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
              <button className={botao} disabled={ocupado}>
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
    <section className="max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h3 className="text-xl font-bold">Equipe e acessos</h3>
      <p className="text-sm text-muted-foreground">
        Compartilhe somente a operação de <strong>{loja.nome}</strong>. A pessoa poderá atender
        pedidos, gerenciar agenda e solicitações e consultar estatísticas. Não poderá editar o site,
        administrar acessos ou ver suas outras empresas.
      </p>
      <ol className="list-inside list-decimal space-y-2 text-sm">
        <li>A pessoa cria sua própria conta Nexa e confirma o e-mail.</li>
        <li>Você adiciona esse e-mail abaixo.</li>
        <li>Envie o link desta operação para ela.</li>
      </ol>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void alterar({ email });
        }}
        className="flex flex-wrap gap-2"
      >
        <input
          aria-label="E-mail da pessoa"
          className={`${campo} flex-1`}
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
      <button
        className={botao}
        onClick={() => {
          void navigator.clipboard
            .writeText(`${window.location.origin}/operacao?site=${loja.id}`)
            .then(
              () => toast.success("Link copiado"),
              () => toast.error("Não foi possível copiar. Use o endereço desta página."),
            );
        }}
      >
        Copiar link da operação
      </button>
      <p className="text-xs text-muted-foreground">
        O link não concede acesso sozinho. Não há envio automático de convite. Ao existir equipe
        autorizada, os alertas de e-mail da operação são direcionados à equipe.
      </p>
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
        <ul className="divide-y divide-border">
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
    </section>
  );
}
