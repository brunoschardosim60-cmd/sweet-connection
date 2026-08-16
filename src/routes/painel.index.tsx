import { createFileRoute, Link } from "@tanstack/react-router";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowUpRight, FileEdit, Globe, MessageCircle, Users } from "lucide-react";
import { useDesempenho, useNexa } from "@/lib/nexa/hooks";
import { numero, tempoRelativo } from "@/lib/nexa/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/painel/")({
  component: VisaoGeral,
});

function VisaoGeral() {
  const { sites, envios, pronto } = useNexa();
  const desempenho = useDesempenho();

  if (!pronto)
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );

  const publicados = sites.filter((s) => s.status === "publicado");
  const rascunhos = sites.filter((s) => s.status === "rascunho");
  const visitas = sites.reduce((total, site) => total + (desempenho[site.id]?.visitas ?? 0), 0);
  const cliques = sites.reduce(
    (total, site) => total + (desempenho[site.id]?.cliquesWhatsapp ?? 0),
    0,
  );
  const solicitacoes = envios.length;

  const visitasPorDia = new Map<string, number>();
  for (const site of sites) {
    for (const registro of desempenho[site.id]?.dias ?? []) {
      visitasPorDia.set(registro.dia, (visitasPorDia.get(registro.dia) ?? 0) + registro.visitas);
    }
  }

  const serie = Array.from({ length: 30 }, (_, i) => {
    const data = new Date();
    data.setDate(data.getDate() - (29 - i));
    const dia = data.toISOString().slice(0, 10);
    return { dia, visitas: visitasPorDia.get(dia) ?? 0 };
  });

  const cards = [
    { r: "Total de clientes", v: numero(sites.length), i: Users },
    { r: "Mini-sites publicados", v: numero(publicados.length), i: Globe },
    { r: "Rascunhos", v: numero(rascunhos.length), i: FileEdit },
    { r: "Visitas no mês", v: numero(visitas), i: ArrowUpRight },
    { r: "Cliques no WhatsApp", v: numero(cliques), i: MessageCircle },
    { r: "Solicitações recebidas", v: numero(solicitacoes), i: ArrowUpRight },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Resumo dos mini-sites dos seus clientes.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.r} className="surface p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{c.r}</p>
              <c.i size={16} className="text-muted-foreground" />
            </div>
            <p className="mt-2 font-display text-3xl font-bold">{c.v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <p className="font-semibold">Visitas nos últimos 30 dias</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie}>
                <defs>
                  <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="dia" hide />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="visitas"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2.5}
                  fill="url(#pv)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface p-5">
          <p className="font-semibold">Atividades recentes</p>
          {sites.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhum registro ainda. As atividades aparecerão aqui quando você criar mini-sites.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {sites.slice(0, 6).map((s) => (
                <li key={s.id}>
                  <Link
                    to="/painel/editor/$id"
                    params={{ id: s.id }}
                    className="flex min-h-11 items-start gap-3 rounded-xl px-2 py-2 hover:bg-secondary"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lime"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{s.conteudo.nome}</span>
                      <span className="block text-xs text-muted-foreground">
                        {s.status === "publicado" ? "Publicado" : "Atualizado"} ·{" "}
                        {tempoRelativo(s.atualizadoEm)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/painel/clientes"
            className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
          >
            Ver todos os clientes
          </Link>
        </div>
      </div>
    </div>
  );
}
