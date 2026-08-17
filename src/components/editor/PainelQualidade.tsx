import { AlertTriangle, ArrowRight, Check, Info } from "lucide-react";
import type { Site, TipoSecao } from "@/lib/nexa/types";

export type DestinoEditor = { aba: string; bloco: string };

type Situacao = "ok" | "atencao";

type Verificacao = {
  id: string;
  titulo: string;
  detalhe: string;
  situacao: Situacao;
  destino: DestinoEditor;
};

/** Blocos de destino no editor por tipo de seção. */
export const destinoPorSecao: Record<TipoSecao, DestinoEditor> = {
  apresentacao: { aba: "conteudo", bloco: "bloco-identificacao" },
  links: { aba: "itens", bloco: "bloco-links" },
  produtos: { aba: "itens", bloco: "bloco-produtos" },
  servicos: { aba: "itens", bloco: "bloco-servicos" },
  cardapio: { aba: "itens", bloco: "bloco-produtos" },
  galeria: { aba: "itens", bloco: "bloco-galeria" },
  videos: { aba: "itens", bloco: "bloco-videos" },
  depoimentos: { aba: "itens", bloco: "bloco-depoimentos" },
  equipe: { aba: "itens", bloco: "bloco-equipe" },
  promocao: { aba: "itens", bloco: "bloco-cupons" },
  cupom: { aba: "itens", bloco: "bloco-cupons" },
  localizacao: { aba: "conteudo", bloco: "bloco-contato" },
  horarios: { aba: "conteudo", bloco: "bloco-horarios" },
  agenda: { aba: "itens", bloco: "bloco-servicos" },
  faq: { aba: "itens", bloco: "bloco-faq" },
  formulario: { aba: "itens", bloco: "bloco-formulario" },
  livre: { aba: "secoes", bloco: "bloco-secoes" },
  rodape: { aba: "conteudo", bloco: "bloco-contato" },
};

function contagemDaSecao(site: Site, tipo: TipoSecao): number | null {
  switch (tipo) {
    case "links":
      return site.links.length;
    case "produtos":
    case "cardapio":
      return site.produtos.length;
    case "servicos":
      return site.servicos.length;
    case "galeria":
      return site.galeria.length;
    case "videos":
      return site.videos?.length ?? 0;
    case "depoimentos":
      return site.depoimentos.length;
    case "equipe":
      return site.equipe.length;
    case "faq":
      return site.faq.length;
    case "cupom":
      return site.cupons.length;
    default:
      return null;
  }
}

/** Verificações calculadas somente com os dados já carregados nesta tela. */
export function verificar(site: Site): Verificacao[] {
  const lista: Verificacao[] = [];
  const add = (v: Verificacao) => lista.push(v);

  add({
    id: "nome",
    titulo: "Nome do negócio preenchido",
    detalhe: site.conteudo.nome.trim() ? site.conteudo.nome : "Ainda sem nome exibido.",
    situacao: site.conteudo.nome.trim() ? "ok" : "atencao",
    destino: { aba: "conteudo", bloco: "bloco-identificacao" },
  });

  const desc = site.conteudo.descricao.trim();
  add({
    id: "descricao",
    titulo: "Descrição curta",
    detalhe: desc ? `${desc.length} caracteres` : "Explique em uma frase o que o negócio faz.",
    situacao: desc.length >= 20 ? "ok" : "atencao",
    destino: { aba: "conteudo", bloco: "bloco-identificacao" },
  });

  add({
    id: "whatsapp",
    titulo: "WhatsApp de contato",
    detalhe: site.conteudo.whatsapp.trim()
      ? site.conteudo.whatsapp
      : "Sem WhatsApp, o botão de contato não leva a lugar nenhum.",
    situacao: site.conteudo.whatsapp.replace(/\D/g, "").length >= 10 ? "ok" : "atencao",
    destino: { aba: "conteudo", bloco: "bloco-contato" },
  });

  add({
    id: "logo",
    titulo: "Logo ou imagem de capa",
    detalhe:
      site.conteudo.logo || site.conteudo.capa
        ? "Imagem definida."
        : "Nenhuma imagem escolhida ainda.",
    situacao: site.conteudo.logo || site.conteudo.capa ? "ok" : "atencao",
    destino: { aba: "conteudo", bloco: "bloco-logo" },
  });

  add({
    id: "slug",
    titulo: "Endereço do mini-site",
    detalhe: `/site/${site.slug || "—"}`,
    situacao: site.slug.trim().length >= 3 ? "ok" : "atencao",
    destino: { aba: "conteudo", bloco: "bloco-identificacao" },
  });

  const ativas = site.secoes.filter((s) => s.ativa);
  add({
    id: "secoes",
    titulo: "Seções ativas",
    detalhe: ativas.length
      ? `${ativas.length} de ${site.secoes.length} seções visíveis.`
      : "Todas as seções estão desativadas.",
    situacao: ativas.length > 0 ? "ok" : "atencao",
    destino: { aba: "secoes", bloco: "bloco-secoes" },
  });

  for (const sec of ativas) {
    if (sec.tipo === "livre") {
      const texto = (sec.conteudo ?? "").trim();
      add({
        id: `secao-${sec.id}`,
        titulo: `Texto do bloco “${sec.titulo}”`,
        detalhe: texto ? `${texto.length} caracteres.` : "Bloco livre ainda sem texto.",
        situacao: texto.length > 0 ? "ok" : "atencao",
        destino: { aba: "secoes", bloco: "bloco-secoes" },
      });
      continue;
    }
    const total = contagemDaSecao(site, sec.tipo);
    if (total === null) continue;
    add({
      id: `secao-${sec.id}`,
      titulo: `Conteúdo da seção “${sec.titulo}”`,
      detalhe: total ? `${total} item(ns) cadastrado(s).` : "Seção ativa e sem nenhum item.",
      situacao: total > 0 ? "ok" : "atencao",
      destino: destinoPorSecao[sec.tipo],
    });
  }

  const t = site.seo.titulo.trim();
  add({
    id: "seo-titulo",
    titulo: "Título para busca e compartilhamento",
    detalhe: t ? `${t.length} caracteres (ideal até 60)` : "Sem título de compartilhamento.",
    situacao: t.length >= 15 && t.length <= 60 ? "ok" : "atencao",
    destino: { aba: "seo", bloco: "bloco-seo" },
  });

  const d = site.seo.descricao.trim();
  add({
    id: "seo-descricao",
    titulo: "Descrição para busca",
    detalhe: d ? `${d.length} caracteres (ideal 50–160)` : "Sem descrição de compartilhamento.",
    situacao: d.length >= 50 && d.length <= 160 ? "ok" : "atencao",
    destino: { aba: "seo", bloco: "bloco-seo" },
  });

  return lista;
}

/** Checklist visual de qualidade — apenas leitura dos dados desta tela. */
export function PainelQualidade({
  site,
  onIr,
}: {
  site: Site;
  onIr: (destino: DestinoEditor) => void;
}) {
  const itens = verificar(site);
  const ok = itens.filter((i) => i.situacao === "ok").length;
  const pct = Math.round((ok / itens.length) * 100);
  const pendentes = itens.filter((i) => i.situacao === "atencao");

  return (
    <div className="surface space-y-4 p-4" id="bloco-qualidade">
      <div>
        <p className="text-sm font-semibold">Checklist de qualidade</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Baseado no conteúdo carregado nesta tela. A publicação, o banco e os formulários são
          confirmados separadamente quando essas ações são executadas.
        </p>
      </div>

      <div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Itens do checklist concluídos"
          className="h-2 w-full overflow-hidden rounded-full bg-secondary"
        >
          <div
            className="h-full rounded-full bg-lime transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground" aria-live="polite">
          {ok} de {itens.length} itens preenchidos ({pct}%)
          {pendentes.length ? ` · ${pendentes.length} para revisar` : ""}
        </p>
      </div>

      <ul className="space-y-2">
        {itens.map((i) => (
          <li
            key={i.id}
            className={`flex min-w-0 items-start gap-2.5 rounded-xl border p-3 ${
              i.situacao === "ok" ? "border-border bg-card" : "border-ember/40 bg-ember/5"
            }`}
          >
            <span
              className={`mt-0.5 shrink-0 ${i.situacao === "ok" ? "text-lime" : "text-ember"}`}
              aria-hidden
            >
              {i.situacao === "ok" ? <Check size={15} /> : <AlertTriangle size={15} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                <span className="sr-only">{i.situacao === "ok" ? "Concluído: " : "Revisar: "}</span>
                {i.titulo}
              </p>
              <p className="break-words text-xs text-muted-foreground">{i.detalhe}</p>
            </div>
            {i.situacao === "atencao" && (
              <button
                type="button"
                onClick={() => onIr(i.destino)}
                className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-border px-2.5 text-xs font-semibold hover:bg-secondary"
              >
                Ajustar <ArrowRight size={12} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>

      <p className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
        Este checklist não publica o site nem envia uma mensagem de teste. Ele apenas aponta o que
        ainda precisa ser revisado antes dessas verificações finais.
      </p>
    </div>
  );
}
