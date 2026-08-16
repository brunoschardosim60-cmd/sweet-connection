import { Globe } from "lucide-react";
import type { Site } from "@/lib/nexa/types";

/**
 * Prévia de como o link do mini-site aparece ao ser compartilhado
 * no WhatsApp e no Facebook.
 */
export function PreviaCompartilhamento({ site, dominio }: { site: Site; dominio: string }) {
  const titulo = site.seo.titulo || site.conteudo.nome;
  const descricao = site.seo.descricao || site.conteudo.descricao;
  const imagem = site.seo.imagem || site.conteudo.capa;
  const url = `${dominio}/site/${site.slug}`;
  const host = dominio.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          WhatsApp
        </p>
        <div className="rounded-2xl bg-[#075E54]/10 p-3">
          <div className="ml-auto max-w-[290px] rounded-xl rounded-tr-sm bg-[#dcf8c6] p-1.5 text-[#111b21] shadow-sm">
            <div className="overflow-hidden rounded-lg bg-white/70">
              {imagem && <img src={imagem} alt="" className="h-28 w-full object-cover" />}
              <div className="p-2">
                <p className="line-clamp-2 text-[12px] font-semibold leading-snug">{titulo}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug opacity-70">
                  {descricao}
                </p>
                <p className="mt-1 text-[10px] uppercase opacity-50">{host}</p>
              </div>
            </div>
            <p className="px-1.5 pb-0.5 pt-1 text-[12px] text-[#1f7aec] underline">{url}</p>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Facebook
        </p>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {imagem ? (
            <img src={imagem} alt="" className="h-36 w-full object-cover" />
          ) : (
            <div className="grid h-36 place-items-center bg-secondary text-muted-foreground">
              <Globe size={22} />
            </div>
          )}
          <div className="border-t border-border bg-secondary/50 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{host}</p>
            <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">{titulo}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{descricao}</p>
          </div>
        </div>
      </div>

      <ul className="space-y-1 text-xs text-muted-foreground">
        <li>Título ideal: até 60 caracteres — atual: {titulo.length}</li>
        <li>Descrição ideal: até 160 caracteres — atual: {descricao.length}</li>
        <li>Imagem recomendada: 1200 × 630 px</li>
      </ul>
    </div>
  );
}
