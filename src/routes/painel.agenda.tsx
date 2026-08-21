import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, MessageCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNexa } from "@/lib/nexa/hooks";
import { whatsappLink } from "@/lib/nexa/brand";
import { dataIso, horariosDoDia, proximosDias, rotuloDia } from "@/lib/nexa/agenda";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/painel/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Nexa" },
      { name: "description", content: "Horários reservados pelos clientes nos seus mini-sites." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Agenda — Nexa" },
      { property: "og:description", content: "Veja, cancele e reagende os horários reservados." },
    ],
  }),
  component: PaginaAgenda,
});

type Agendamento = {
  id: string;
  minisite_id: string;
  data: string;
  hora: string;
  servico: string;
  nome: string;
  telefone: string;
  observacao: string;
  status: string;
  created_at: string;
  data_original: string | null;
  hora_original: string | null;
  reagendamentos: number | null;
  reagendado_em: string | null;
};

function dataBr(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function PaginaAgenda() {
  const { sites, pronto } = useNexa();
  const [linhas, setLinhas] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<"proximos" | "todos" | "cancelados">("proximos");
  const [reagendando, setReagendando] = useState<Agendamento | null>(null);

  const idsDosSites = useMemo(() => sites.map((s) => s.id), [sites]);
  const nomePorSite = useMemo(
    () =>
      Object.fromEntries(
        sites.map((s) => [s.id, s.conteudo.nome || s.cliente.empresa || s.slug]),
      ) as Record<string, string>,
    [sites],
  );

  const carregar = useCallback(async () => {
    if (idsDosSites.length === 0) {
      setLinhas([]);
      setCarregando(false);
      return;
    }
    const { data, error } = await supabase
      .from("agendamentos")
      .select("*")
      .in("minisite_id", idsDosSites)
      .order("data", { ascending: true })
      .order("hora", { ascending: true });
    if (error) toast.error("Não foi possível carregar a agenda.");
    setLinhas((data ?? []) as Agendamento[]);
    setCarregando(false);
  }, [idsDosSites]);

  useEffect(() => {
    if (!pronto) return;
    void carregar();
  }, [carregar, pronto]);

  // Atualização em tempo real: novas reservas e cancelamentos aparecem sozinhos.
  useEffect(() => {
    if (!pronto || idsDosSites.length === 0) return;
    const canal = supabase
      .channel("agenda-painel")
      .on("postgres_changes", { event: "*", schema: "public", table: "agendamentos" }, () => {
        void carregar();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [carregar, idsDosSites.length, pronto]);

  const hoje = dataIso(new Date());
  const visiveis = linhas.filter((l) =>
    filtro === "cancelados"
      ? l.status === "cancelado"
      : filtro === "todos"
        ? true
        : l.status === "confirmado" && l.data >= hoje,
  );

  async function cancelar(item: Agendamento) {
    const { error } = await supabase
      .from("agendamentos")
      .update({ status: "cancelado" })
      .eq("id", item.id);
    if (error) {
      toast.error("Não foi possível cancelar.");
      return;
    }
    toast.success("Horário cancelado e liberado.");
    void carregar();
  }

  async function reagendar(item: Agendamento, data: string, hora: string) {
    const { error } = await supabase
      .from("agendamentos")
      .update({ data, hora })
      .eq("id", item.id)
      .eq("status", "confirmado");
    if (error) {
      toast.error(
        error.code === "23505" ? "Já existe reserva nesse horário." : "Não foi possível reagendar.",
      );
      return;
    }
    toast.success("Horário reagendado.");
    setReagendando(null);
    void carregar();
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Horários reservados pelos clientes, atualizados em tempo real.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void carregar()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium"
        >
          <RefreshCw size={15} aria-hidden /> Atualizar
        </button>
      </header>

      <div role="group" aria-label="Filtro da agenda" className="flex flex-wrap gap-2">
        {(
          [
            { id: "proximos", rotulo: "Próximos" },
            { id: "todos", rotulo: "Todos" },
            { id: "cancelados", rotulo: "Cancelados" },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filtro === f.id}
            onClick={() => setFiltro(f.id)}
            className={`min-h-11 rounded-full px-4 text-sm font-medium ${
              filtro === f.id
                ? "bg-ink text-ink-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      {carregando || !pronto ? (
        <div className="flex flex-col gap-2" aria-live="polite" aria-busy="true">
          <span className="sr-only">Carregando agenda…</span>
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : visiveis.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <CalendarDays size={24} className="mx-auto text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-semibold">
            {filtro === "cancelados"
              ? "Nenhum horário cancelado"
              : filtro === "todos"
                ? "Nenhum horário registrado ainda"
                : "Nenhum horário próximo"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Ative a seção Agenda no editor do mini-site e publique para começar a receber reservas.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3" aria-live="polite">
          {visiveis.map((item) => {
            const cancelado = item.status === "cancelado";
            const editando = reagendando?.id === item.id;
            const vezes = item.reagendamentos ?? 0;
            const foiReagendado = vezes > 0;
            return (
              <li
                key={item.id}
                className={`overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)] transition-colors motion-reduce:transition-none ${
                  editando ? "border-ink" : "border-border"
                } ${cancelado ? "opacity-80" : ""}`}
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4">
                  <div
                    className={`flex shrink-0 flex-row items-center gap-2 rounded-xl px-3 py-2 sm:w-24 sm:flex-col sm:gap-0.5 sm:py-3 ${
                      cancelado ? "bg-secondary text-muted-foreground" : "bg-lime text-ink"
                    }`}
                  >
                    <span className="text-base font-semibold leading-none">{item.hora}</span>
                    <span className="text-xs leading-none opacity-80">{dataBr(item.data)}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{item.nome}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          cancelado
                            ? "bg-secondary text-muted-foreground"
                            : "bg-ink text-ink-foreground"
                        }`}
                      >
                        {cancelado ? "Cancelado" : "Confirmado"}
                      </span>
                      {foiReagendado && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-foreground">
                          Reagendado{vezes > 1 ? ` ${vezes}×` : ""}
                        </span>
                      )}
                      {editando && !cancelado && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Reagendando
                        </span>
                      )}
                    </div>
                    <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                      <div className="flex min-w-0 gap-1.5">
                        <dt className="text-muted-foreground">Mini-site:</dt>
                        <dd className="truncate font-medium">
                          {nomePorSite[item.minisite_id] ?? "—"}
                        </dd>
                      </div>
                      <div className="flex min-w-0 gap-1.5">
                        <dt className="text-muted-foreground">Serviço:</dt>
                        <dd className="truncate font-medium">{item.servico || "—"}</dd>
                      </div>
                      <div className="flex min-w-0 gap-1.5">
                        <dt className="text-muted-foreground">Contato:</dt>
                        <dd className="truncate font-medium">{item.telefone || "—"}</dd>
                      </div>
                      {item.observacao && (
                        <div className="flex min-w-0 gap-1.5 sm:col-span-2">
                          <dt className="text-muted-foreground">Observação:</dt>
                          <dd className="truncate font-medium">{item.observacao}</dd>
                        </div>
                      )}
                      {foiReagendado && item.data_original && (
                        <div className="flex min-w-0 flex-wrap gap-1.5 sm:col-span-2">
                          <dt className="text-muted-foreground">Horário original:</dt>
                          <dd className="font-medium">
                            <span className="line-through">
                              {dataBr(item.data_original)} às {item.hora_original ?? "—"}
                            </span>
                            {item.reagendado_em && (
                              <span className="ml-1.5 text-muted-foreground">
                                (alterado em {dataHoraBr(item.reagendado_em)})
                              </span>
                            )}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-border bg-secondary/30 px-4 py-3">
                  {item.telefone && (
                    <a
                      href={whatsappLink(
                        item.telefone,
                        `Olá ${item.nome}! Sobre seu horário em ${dataBr(item.data)} às ${item.hora}.`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-ink px-4 text-xs font-semibold text-ink-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      <MessageCircle size={14} aria-hidden /> WhatsApp
                    </a>
                  )}
                  {!cancelado && (
                    <>
                      <button
                        type="button"
                        onClick={() => setReagendando(editando ? null : item)}
                        aria-expanded={editando}
                        className="min-h-11 rounded-full border border-border bg-background px-4 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        {editando ? "Fechar reagendamento" : "Reagendar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void cancelar(item)}
                        className="ml-auto min-h-11 rounded-full border border-destructive/30 px-4 text-xs font-medium text-destructive focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </div>

                {editando && (
                  <div className="px-4 pb-4">
                    <FormularioReagendar
                      item={item}
                      onCancelar={() => setReagendando(null)}
                      onSalvar={(data, hora) => void reagendar(item, data, hora)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function FormularioReagendar({
  item,
  onSalvar,
  onCancelar,
}: {
  item: Agendamento;
  onSalvar: (data: string, hora: string) => void;
  onCancelar: () => void;
}) {
  const { sites } = useNexa();
  const site = sites.find((s) => s.id === item.minisite_id);
  const dias = useMemo(() => proximosDias(21), []);
  const [data, setData] = useState(item.data);
  const [hora, setHora] = useState(item.hora);

  const dia = dias.find((d) => dataIso(d) === data) ?? dias[0]!;
  const horas = site
    ? horariosDoDia(site.conteudo.horarios, dia, site.agenda?.intervalo ?? 30)
    : [];

  return (
    <div className="mt-3 grid gap-2 rounded-2xl border border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Novo dia</span>
        <select
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="min-h-11 w-full rounded-lg border border-border bg-background px-2 text-sm"
        >
          {dias.map((d) => (
            <option key={dataIso(d)} value={dataIso(d)}>
              {rotuloDia(d)}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Novo horário</span>
        {horas.length > 0 ? (
          <select
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-border bg-background px-2 text-sm"
          >
            {[...new Set([hora, ...horas])].map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            placeholder="00:00"
            className="min-h-11 w-full rounded-lg border border-border bg-background px-2 text-sm"
          />
        )}
      </label>
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => onSalvar(data, hora)}
          className="min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-ink-foreground"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="min-h-11 rounded-full border border-border px-4 text-sm font-medium"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
