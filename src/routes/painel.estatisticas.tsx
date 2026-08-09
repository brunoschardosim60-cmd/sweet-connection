import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, Area, AreaChart } from "recharts";
import { useNexa } from "@/lib/nexa/hooks";
import { numero } from "@/lib/nexa/utils";

export const Route = createFileRoute("/painel/estatisticas")({
  component: Estatisticas,
});

function Estatisticas() {
  const { sites } = useNexa();
  const principal = sites[0];
  const visitas = sites.reduce((t, s) => t + s.metricas.visitas, 0);
  const cliques = sites.reduce((t, s) => t + s.metricas.cliquesWhatsapp, 0);
  const conversao = visitas ? ((cliques / visitas) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Estatísticas</h1>
        <p className="text-sm text-muted-foreground">Dados simulados de todos os mini-sites.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface p-5">
          <p className="text-sm text-muted-foreground">Visitas</p>
          <p className="font-display text-3xl font-bold">{numero(visitas)}</p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-muted-foreground">Cliques no WhatsApp</p>
          <p className="font-display text-3xl font-bold">{numero(cliques)}</p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-muted-foreground">Taxa de conversão</p>
          <p className="font-display text-3xl font-bold">{conversao}%</p>
        </div>
      </div>

      {principal && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="surface p-5">
            <p className="font-semibold">Visitas por dia</p>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={principal.metricas.serie}>
                  <XAxis dataKey="dia" hide />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="visitas"
                    stroke="var(--color-chart-1)"
                    fill="var(--color-chart-1)"
                    fillOpacity={0.25}
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="surface p-5">
            <p className="font-semibold">Horários de maior movimento</p>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={principal.metricas.horarios}>
                  <XAxis dataKey="hora" tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="valor" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="surface p-5 lg:col-span-2">
            <p className="font-semibold">Origem dos visitantes</p>
            <ul className="mt-4 space-y-3">
              {principal.metricas.origens.map((o) => (
                <li key={o.nome} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-muted-foreground">{o.nome}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <span
                      className="block h-full rounded-full bg-lime"
                      style={{ width: `${o.valor}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right font-medium">{o.valor}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
