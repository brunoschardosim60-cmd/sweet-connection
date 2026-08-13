import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, Area, AreaChart } from "recharts";
import { toast } from "sonner";
import { analytics } from "@/lib/nexa/analytics";
import { useDesempenho, useNexa } from "@/lib/nexa/hooks";
import { numero } from "@/lib/nexa/utils";

export const Route = createFileRoute("/painel/estatisticas")({
  component: Estatisticas,
});

function Estatisticas() {
  const { sites } = useNexa();
  const desempenho = useDesempenho();
  const reais = sites.map((s) => ({ site: s, dados: desempenho[s.id] }));
  const visitasReais = reais.reduce((t, r) => t + (r.dados?.visitas ?? 0), 0);
  const cliquesReais = reais.reduce((t, r) => t + (r.dados?.cliques ?? 0), 0);
  const principal = sites[0];
  const visitas = sites.reduce((t, s) => t + s.metricas.visitas, 0);
  const cliques = sites.reduce((t, s) => t + s.metricas.cliquesWhatsapp, 0);
  const conversao = visitas ? ((cliques / visitas) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Estatísticas</h1>
        <p className="text-sm text-muted-foreground">
          Desempenho real medido neste navegador, junto dos dados simulados de demonstração.
        </p>
      </div>

      <div className="surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Desempenho real (contador local)</p>
            <p className="text-xs text-muted-foreground">
              Contabiliza visitas e cliques nas páginas publicadas em /site/&#123;slug&#125;, neste
              navegador.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              analytics.limpar();
              toast.success("Contador zerado");
            }}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
          >
            Zerar contador
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Visitas reais</p>
            <p className="font-display text-2xl font-bold">{numero(visitasReais)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Cliques reais</p>
            <p className="font-display text-2xl font-bold">{numero(cliquesReais)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Conversão real</p>
            <p className="font-display text-2xl font-bold">
              {visitasReais ? ((cliquesReais / visitasReais) * 100).toFixed(1) : "0"}%
            </p>
          </div>
        </div>

        {visitasReais + cliquesReais === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Ainda não há registros. Abra um mini-site publicado para começar a medir.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {reais
              .filter((r) => r.dados)
              .map(({ site, dados }) => (
                <li key={site.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold">{site.conteudo.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {numero(dados!.visitas)} visitas · {numero(dados!.cliques)} cliques ·{" "}
                      {numero(dados!.cliquesWhatsapp)} no WhatsApp
                    </p>
                  </div>
                  {Object.keys(dados!.porLink).length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {Object.entries(dados!.porLink)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 6)
                        .map(([rotulo, valor]) => (
                          <li key={rotulo} className="flex items-center gap-3 text-xs">
                            <span className="w-40 shrink-0 truncate text-muted-foreground">
                              {rotulo}
                            </span>
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                              <span
                                className="block h-full rounded-full bg-lime"
                                style={{
                                  width: `${Math.round((valor / Math.max(...Object.values(dados!.porLink))) * 100)}%`,
                                }}
                              />
                            </span>
                            <span className="w-8 shrink-0 text-right font-medium">{valor}</span>
                          </li>
                        ))}
                    </ul>
                  )}
                </li>
              ))}
          </ul>
        )}
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
