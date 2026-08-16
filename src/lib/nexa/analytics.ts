import { supabase } from "@/integrations/supabase/client";

export interface RegistroDia {
  dia: string;
  visitas: number;
  cliques: number;
}

export interface DesempenhoSite {
  visitas: number;
  cliques: number;
  cliquesWhatsapp: number;
  formularios: number;
  porLink: Record<string, number>;
  dias: RegistroDia[];
  ultimaVisita?: string;
}

type Mapa = Record<string, DesempenhoSite>;

const vazio = (): DesempenhoSite => ({
  visitas: 0,
  cliques: 0,
  cliquesWhatsapp: 0,
  formularios: 0,
  porLink: {},
  dias: [],
});

let cache: Mapa = {};
let carregando = false;
const ouvintes = new Set<() => void>();
const notificar = () => ouvintes.forEach((fn) => fn());

export const analytics = {
  subscribe(fn: () => void) {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
  },
  tudo: () => cache,
  doSite(siteId: string) {
    return cache[siteId] ?? vazio();
  },
  async carregar(forcar = false) {
    if (carregando || (!forcar && Object.keys(cache).length > 0)) return;
    carregando = true;
    try {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("minisite_id,event_type,target,occurred_at")
        .order("occurred_at", { ascending: true });
      if (error) throw new Error(error.message);

      const mapa: Mapa = {};
      for (const evento of data) {
        const atual = (mapa[evento.minisite_id] ??= vazio());
        const dia = evento.occurred_at.slice(0, 10);
        let registro = atual.dias.find((item) => item.dia === dia);
        if (!registro) {
          registro = { dia, visitas: 0, cliques: 0 };
          atual.dias.push(registro);
        }

        if (evento.event_type === "visita") {
          atual.visitas += 1;
          atual.ultimaVisita = evento.occurred_at;
          registro.visitas += 1;
        } else if (evento.event_type === "formulario") {
          atual.formularios += 1;
        } else {
          atual.cliques += 1;
          registro.cliques += 1;
          if (evento.event_type === "whatsapp") atual.cliquesWhatsapp += 1;
          const alvo = evento.target || "Outro link";
          atual.porLink[alvo] = (atual.porLink[alvo] ?? 0) + 1;
        }
      }

      for (const item of Object.values(mapa)) item.dias = item.dias.slice(-60);
      cache = mapa;
      notificar();
    } finally {
      carregando = false;
    }
  },
  reset() {
    cache = {};
    carregando = false;
    notificar();
  },
};
