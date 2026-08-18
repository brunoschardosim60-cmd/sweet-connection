import { useMemo, useState } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import type { PlanoIA } from "@/lib/nexa/ia-tipos";
import type { TipoSecao } from "@/lib/nexa/types";

const ROTULOS: Partial<Record<TipoSecao, string>> = {
  apresentacao: "Apresentação",
  links: "Links rápidos",
  produtos: "Produtos",
  servicos: "Serviços",
  cardapio: "Cardápio",
  galeria: "Galeria",
  videos: "Vídeos",
  depoimentos: "Depoimentos",
  equipe: "Equipe",
  promocao: "Promoção",
  cupom: "Cupom",
  localizacao: "Localização",
  horarios: "Horários",
  agenda: "Agenda",
  faq: "Perguntas frequentes",
  formulario: "Formulário",
  rodape: "Rodapé",
};

const campo =
  "w-full rounded-xl border border-border bg-card p-2.5 text-sm outline-none focus:border-ink";

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border p-3">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h4>
      {children}
    </section>
  );
}

/**
 * Tela de revisão: a pessoa aprova (ou ajusta) seções e textos sugeridos
 * pela IA antes de o mini-site ser criado.
 */
export function RevisaoIA({
  plano,
  criando,
  onAprovar,
  onRegerar,
  onCancelar,
}: {
  plano: PlanoIA;
  criando?: boolean;
  onAprovar: (plano: PlanoIA) => void;
  onRegerar: () => void;
  onCancelar: () => void;
}) {
  const [descricao, setDescricao] = useState(plano.descricao ?? "");
  const [seoTitulo, setSeoTitulo] = useState(plano.seo?.titulo ?? "");
  const [seoDescricao, setSeoDescricao] = useState(plano.seo?.descricao ?? "");

  const secoesSugeridas = useMemo(() => {
    const base = new Set<TipoSecao>(plano.secoes ?? []);
    if (plano.produtos?.length) base.add("produtos");
    if (plano.servicos?.length) base.add("servicos");
    if (plano.depoimentos?.length) base.add("depoimentos");
    if (plano.faq?.length) base.add("faq");
    base.add("apresentacao");
    base.add("links");
    base.add("rodape");
    return [...base];
  }, [plano]);

  const [secoes, setSecoes] = useState<TipoSecao[]>(secoesSugeridas);
  const [servicos, setServicos] = useState(plano.servicos ?? []);
  const [produtos, setProdutos] = useState(plano.produtos ?? []);
  const [depoimentos, setDepoimentos] = useState(plano.depoimentos ?? []);
  const [faq, setFaq] = useState(plano.faq ?? []);

  const alternar = (tipo: TipoSecao) =>
    setSecoes((atual) =>
      atual.includes(tipo) ? atual.filter((t) => t !== tipo) : [...atual, tipo],
    );

  const aprovar = () =>
    onAprovar({
      ...plano,
      descricao: descricao.trim() || plano.descricao,
      secoes,
      servicos: secoes.includes("servicos") ? servicos : [],
      produtos: secoes.includes("produtos") ? produtos : [],
      depoimentos: secoes.includes("depoimentos") ? depoimentos : [],
      faq: secoes.includes("faq") ? faq : [],
      seo: {
        ...plano.seo,
        ...(seoTitulo.trim() ? { titulo: seoTitulo.trim() } : {}),
        ...(seoDescricao.trim() ? { descricao: seoDescricao.trim() } : {}),
      },
    });

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-ink/20 bg-secondary/40 p-3 sm:p-4">
      <div>
        <h3 className="font-display text-sm font-bold">Revise antes de criar</h3>
        <p className="text-xs text-muted-foreground">
          Ajuste os textos e escolha as seções. Nada é criado até você aprovar.
        </p>
      </div>

      <Bloco titulo="Texto de apresentação">
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
          className={campo}
          aria-label="Texto de apresentação"
        />
      </Bloco>

      <Bloco titulo="Seções sugeridas">
        <ul className="flex flex-wrap gap-2">
          {secoesSugeridas.map((tipo) => {
            const ativa = secoes.includes(tipo);
            return (
              <li key={tipo}>
                <button
                  type="button"
                  aria-pressed={ativa}
                  onClick={() => alternar(tipo)}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${
                    ativa
                      ? "border-ink bg-ink text-ink-foreground"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {ativa ? <Check size={13} /> : <X size={13} />}
                  {ROTULOS[tipo] ?? tipo}
                </button>
              </li>
            );
          })}
        </ul>
      </Bloco>

      {!!servicos.length && secoes.includes("servicos") && (
        <Bloco titulo="Serviços sugeridos">
          <ul className="space-y-2">
            {servicos.map((s, i) => (
              <li key={`${s.nome}-${i}`} className="flex items-center gap-2">
                <input
                  value={s.nome}
                  onChange={(e) =>
                    setServicos((a) =>
                      a.map((it, j) => (j === i ? { ...it, nome: e.target.value } : it)),
                    )
                  }
                  className={campo}
                  aria-label={`Nome do serviço ${i + 1}`}
                />
                <button
                  type="button"
                  aria-label={`Remover serviço ${s.nome}`}
                  onClick={() => setServicos((a) => a.filter((_, j) => j !== i))}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      {!!produtos.length && secoes.includes("produtos") && (
        <Bloco titulo="Produtos sugeridos">
          <ul className="space-y-2">
            {produtos.map((p, i) => (
              <li key={`${p.nome}-${i}`} className="flex items-center gap-2">
                <input
                  value={p.nome}
                  onChange={(e) =>
                    setProdutos((a) =>
                      a.map((it, j) => (j === i ? { ...it, nome: e.target.value } : it)),
                    )
                  }
                  className={campo}
                  aria-label={`Nome do produto ${i + 1}`}
                />
                <button
                  type="button"
                  aria-label={`Remover produto ${p.nome}`}
                  onClick={() => setProdutos((a) => a.filter((_, j) => j !== i))}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      {!!depoimentos.length && secoes.includes("depoimentos") && (
        <Bloco titulo="Depoimentos sugeridos">
          <ul className="space-y-2 text-sm">
            {depoimentos.map((d, i) => (
              <li key={`${d.nome}-${i}`} className="flex items-start gap-2">
                <p className="flex-1 rounded-xl border border-border bg-card p-2.5 text-xs">
                  <strong>{d.nome}:</strong> {d.comentario}
                </p>
                <button
                  type="button"
                  aria-label={`Remover depoimento de ${d.nome}`}
                  onClick={() => setDepoimentos((a) => a.filter((_, j) => j !== i))}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      {!!faq.length && secoes.includes("faq") && (
        <Bloco titulo="Perguntas frequentes">
          <ul className="space-y-2">
            {faq.map((f, i) => (
              <li key={`${f.pergunta}-${i}`} className="flex items-start gap-2">
                <p className="flex-1 rounded-xl border border-border bg-card p-2.5 text-xs">
                  <strong>{f.pergunta}</strong>
                  <br />
                  {f.resposta}
                </p>
                <button
                  type="button"
                  aria-label={`Remover pergunta ${f.pergunta}`}
                  onClick={() => setFaq((a) => a.filter((_, j) => j !== i))}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      <Bloco titulo="SEO">
        <div className="space-y-2">
          <input
            value={seoTitulo}
            onChange={(e) => setSeoTitulo(e.target.value)}
            className={campo}
            placeholder="Título para buscadores"
            aria-label="Título de SEO"
          />
          <textarea
            value={seoDescricao}
            onChange={(e) => setSeoDescricao(e.target.value)}
            rows={2}
            className={campo}
            placeholder="Descrição para buscadores"
            aria-label="Descrição de SEO"
          />
        </div>
      </Bloco>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={aprovar}
          disabled={criando}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-ink-foreground disabled:opacity-70 sm:flex-none"
        >
          {criando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Aprovar e criar
        </button>
        <button
          type="button"
          onClick={onRegerar}
          disabled={criando}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
        >
          <RefreshCw size={15} />
          Gerar de novo
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={criando}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-muted-foreground hover:bg-secondary disabled:opacity-60"
        >
          Descartar
        </button>
      </div>
    </div>
  );
}
