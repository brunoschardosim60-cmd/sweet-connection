import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarCheck, CircleX, Loader2, MessageCircle } from "lucide-react";
import { buscarAgendamento, cancelarAgendamento, type ResumoAgendamento } from "@/lib/nexa/agenda";
import { whatsappLink } from "@/lib/nexa/brand";

export const Route = createFileRoute("/agendamento/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Confirmação do agendamento — Nexa" },
      {
        name: "description",
        content: "Resumo do horário reservado, com opção de cancelar quando precisar.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Confirmação do agendamento — Nexa" },
      { property: "og:description", content: "Veja e gerencie o horário que você reservou." },
    ],
  }),
  component: PaginaAgendamento,
});

function dataBr(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function PaginaAgendamento() {
  const { token } = Route.useParams();
  const [resumo, setResumo] = useState<ResumoAgendamento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    buscarAgendamento(token)
      .then((r) => ativo && setResumo(r))
      .catch((e) => ativo && setErro(e instanceof Error ? e.message : "Erro ao carregar."))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [token]);

  const cancelado = resumo?.status === "cancelado";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-4 px-4 py-10">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        {carregando ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" aria-hidden /> Carregando agendamento…
          </p>
        ) : erro || !resumo ? (
          <>
            <h1 className="text-lg font-semibold">Agendamento não encontrado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {erro ?? "Confira o link recebido ou fale direto com o estabelecimento."}
            </p>
          </>
        ) : (
          <>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                cancelado ? "bg-secondary text-muted-foreground" : "bg-lime text-ink"
              }`}
            >
              {cancelado ? (
                <CircleX size={13} aria-hidden />
              ) : (
                <CalendarCheck size={13} aria-hidden />
              )}
              {cancelado ? "Agendamento cancelado" : "Horário confirmado"}
            </span>
            <h1 className="mt-3 text-xl font-semibold">{resumo.negocio}</h1>
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between gap-3 border-b border-border pb-2">
                <dt className="text-muted-foreground">Data</dt>
                <dd className="font-medium">{dataBr(resumo.data)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-border pb-2">
                <dt className="text-muted-foreground">Horário</dt>
                <dd className="font-medium">{resumo.hora}</dd>
              </div>
              {resumo.servico && (
                <div className="flex justify-between gap-3 border-b border-border pb-2">
                  <dt className="text-muted-foreground">Serviço</dt>
                  <dd className="font-medium">{resumo.servico}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Nome</dt>
                <dd className="font-medium">{resumo.nome}</dd>
              </div>
            </dl>

            {!cancelado && (
              <p className="mt-4 rounded-2xl bg-secondary/60 p-3 text-xs text-muted-foreground">
                Você já pode enviar a confirmação para o WhatsApp do estabelecimento pelo botão
                abaixo. A equipe também vê esse horário no painel dela.
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              {!cancelado && resumo.whatsapp && (
                <a
                  href={whatsappLink(
                    resumo.whatsapp,
                    `Olá! Confirmando meu horário em ${dataBr(resumo.data)} às ${resumo.hora}${
                      resumo.servico ? ` (${resumo.servico})` : ""
                    }. Nome: ${resumo.nome}.`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-ink-foreground"
                >
                  <MessageCircle size={15} aria-hidden /> Falar no WhatsApp
                </a>
              )}

              {!cancelado &&
                (confirmarCancelamento ? (
                  <div className="rounded-2xl border border-border p-3">
                    <p className="text-sm font-medium">Cancelar este horário?</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      O horário volta a ficar disponível para outras pessoas.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={cancelando}
                        onClick={async () => {
                          setCancelando(true);
                          try {
                            const ok = await cancelarAgendamento(token);
                            if (ok) setResumo({ ...resumo, status: "cancelado" });
                            else setErro("Este agendamento já não estava ativo.");
                          } catch (e) {
                            setErro(e instanceof Error ? e.message : "Erro ao cancelar.");
                          } finally {
                            setCancelando(false);
                            setConfirmarCancelamento(false);
                          }
                        }}
                        className="min-h-11 flex-1 rounded-full bg-destructive px-4 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
                      >
                        {cancelando ? "Cancelando…" : "Sim, cancelar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmarCancelamento(false)}
                        className="min-h-11 flex-1 rounded-full border border-border px-4 text-sm font-medium"
                      >
                        Manter horário
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmarCancelamento(true)}
                    className="min-h-11 rounded-full border border-border px-4 text-sm font-medium"
                  >
                    Cancelar agendamento
                  </button>
                ))}

              <Link
                to="/site/$slug"
                params={{ slug: resumo.slug }}
                className="min-h-11 rounded-full px-4 text-center text-sm font-medium leading-[2.75rem] text-muted-foreground underline"
              >
                Voltar para o site
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
