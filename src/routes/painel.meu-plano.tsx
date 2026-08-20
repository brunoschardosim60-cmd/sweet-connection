import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/painel/meu-plano")({ component: MeuPlano });

type Assinatura = { subscription_tier: string; subscription_status: string };

const nomes: Record<string, string> = { none: "Sem plano", essential: "Essencial", professional: "Profissional", catalog: "Catálogo" };

function MeuPlano() {
  const [dados, setDados] = useState<Assinatura | null>(null);
  useEffect(() => { void supabase.from("profiles").select("subscription_tier,subscription_status").single().then(({ data }) => setDados(data)); }, []);
  if (!dados) return <div className="grid min-h-[40vh] place-items-center"><Loader2 className="animate-spin" /></div>;
  const ativo = dados.subscription_status === "active" && dados.subscription_tier !== "none";
  return <section className="mx-auto max-w-2xl space-y-5"><header><h1 className="text-2xl font-bold">Meu plano</h1><p className="text-sm text-muted-foreground">Acompanhe o acesso da sua conta e escolha o plano ideal.</p></header><div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-secondary"><Crown size={20}/></span><div><p className="font-bold">{nomes[dados.subscription_tier] ?? "Sem plano"}</p><p className="text-sm text-muted-foreground">{ativo ? "Assinatura ativa" : "Sem assinatura ativa"}</p></div></div><p className="mt-4 text-sm text-muted-foreground">{ativo ? "Seu acesso de publicação está liberado conforme os limites do plano." : "Você pode criar um rascunho, mas precisa ativar um plano para publicar ou usar a criação com IA."}</p><Link to="/" hash="planos" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-ink-foreground">Ver planos</Link></div></section>;
}
