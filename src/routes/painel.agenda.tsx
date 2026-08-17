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
        <div className="flex flex-col gap-2">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : visiveis.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <CalendarDays size={22} className="mx-auto text-muted-foreground" aria-hidden />
          <p className="mt-2 text-sm font-medium">Nenhum horário nesta lista</p>
          <p className="text-xs text-muted-foreground">
            Ative a seção Agenda no editor do mini-site para receber reservas.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visiveis.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {dataBr(item.data)} às {item.hora}
                    {item.status === "cancelado" && (
                      <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        cancelado
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm">{item.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[nomePorSite[item.minisite_id], item.servico, item.telefone]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.telefone && (
                    <a
                      href={whatsappLink(
                        item.telefone,
                        `Olá ${item.nome}! Sobre seu horário em ${dataBr(item.data)} às ${item.hora}.`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium"
                    >
                      <MessageCircle size={14} aria-hidden /> WhatsApp
                    </a>
                  )}
                  {item.status === "confirmado" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setReagendando(item)}
                        className="min-h-11 rounded-full border border-border px-3 text-xs font-medium"
                      >
                        Reagendar
                      </button>
                      <button
                        type="button"
                        onClick={() => void cancelar(item)}
                        className="min-h-11 rounded-full border border-border px-3 text-xs font-medium text-destructive"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {reagendando?.id === item.id && (
                <FormularioReagendar
                  item={item}
                  onCancelar={() => setReagendando(null)}
                  onSalvar={(data, hora) => void reagendar(item, data, hora)}
                />
              )}
            </li>
          ))}
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
