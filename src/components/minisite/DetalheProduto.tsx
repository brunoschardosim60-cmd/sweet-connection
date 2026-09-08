import { useState } from "react";
import { Minus, Plus, X, Maximize2 } from "lucide-react";
import { useFocoModal } from "./useFocoModal";
import { contraste } from "./estilo";
import { calcularPersonalizacao, gruposProduto } from "@/lib/nexa/personalizacao";
import { produtoDisponivelAgora } from "@/lib/nexa/catalogo";
import { moeda } from "@/lib/nexa/utils";
import type { EscolhaProduto, Produto, Site } from "@/lib/nexa/types";

export function DetalheProduto({
  site,
  produto,
  onAdicionar,
  onFechar,
}: {
  site: Site;
  produto: Produto;
  onAdicionar: (escolhas: EscolhaProduto[], observacao: string, quantidade: number) => boolean;
  onFechar: () => void;
}) {
  const ref = useFocoModal(true, onFechar);
  const [escolhas, setEscolhas] = useState<EscolhaProduto[]>([]);
  const [nota, setNota] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [fotoAmpliada, setFotoAmpliada] = useState(false);
  const [aviso, setAviso] = useState("");
  const grupos = gruposProduto(produto);
  const calculo = calcularPersonalizacao(produto, escolhas);
  const disponivel = produtoDisponivelAgora(produto);
  const primaria = site.aparencia.corPrimaria;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden p-2 @2xl:items-center">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onFechar}
        className="absolute inset-0 bg-black/60"
      />
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={produto.nome}
        className="scrollbar-invisivel relative flex max-h-full w-full max-w-lg flex-col overflow-y-auto rounded-2xl p-4"
        style={{ background: site.aparencia.corFundo, color: site.aparencia.corTexto }}
      >
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs opacity-65">{produto.categoria}</p>
            <h2 className="text-xl font-semibold">{produto.nome}</h2>
          </div>
          <button
            type="button"
            aria-label="Fechar detalhes do item"
            onClick={onFechar}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border"
          >
            <X size={18} />
          </button>
        </header>
        {produto.imagem && (
          <button
            type="button"
            onClick={() => setFotoAmpliada(!fotoAmpliada)}
            aria-expanded={fotoAmpliada}
            aria-label={fotoAmpliada ? "Reduzir foto do produto" : "Ampliar foto do produto"}
            className="relative mb-4 shrink-0 overflow-hidden rounded-xl"
          >
            <img
              src={produto.imagem}
              alt={produto.nome}
              className={
                fotoAmpliada ? "max-h-[65dvh] w-full object-contain" : "h-52 w-full object-cover"
              }
            />
            <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/75 px-3 py-2 text-xs text-white">
              <Maximize2 size={13} />
              {fotoAmpliada ? "Reduzir" : "Ampliar foto"}
            </span>
          </button>
        )}
        {produto.descricao && (
          <p className="text-sm leading-relaxed opacity-85">{produto.descricao}</p>
        )}
        <p className="my-3 text-2xl font-bold">
          {moeda(calculo.preco)} <span className="text-xs font-normal opacity-60">por unidade</span>
        </p>
        <div className="space-y-4">
          {grupos.map((grupo) => (
            <fieldset
              key={grupo.id}
              className="rounded-xl border p-3"
              style={{ borderColor: "var(--ms-border)" }}
            >
              <legend className="px-1 text-sm font-semibold">{grupo.nome}</legend>
              <p className="mb-2 text-xs opacity-65">
                {grupo.minimo > 0 ? `Obrigatório · mínimo ${grupo.minimo}` : "Opcional"} · até{" "}
                {grupo.maximo}
              </p>
              {grupo.opcoes.map((opcao) => {
                const marcado = escolhas.some(
                  (e) => e.grupoId === grupo.id && e.opcaoId === opcao.id,
                );
                const limite =
                  grupo.maximo > 1 &&
                  escolhas.filter((e) => e.grupoId === grupo.id).length >= grupo.maximo;
                return (
                  <label
                    key={opcao.id}
                    className="flex min-h-11 cursor-pointer items-center gap-3 border-t py-2 text-sm"
                    style={{ borderColor: "var(--ms-border)" }}
                  >
                    <input
                      type="checkbox"
                      checked={marcado}
                      disabled={!marcado && limite}
                      style={{ accentColor: primaria }}
                      className="h-5 w-5"
                      onChange={() =>
                        setEscolhas((atual) =>
                          marcado
                            ? atual.filter(
                                (e) => !(e.grupoId === grupo.id && e.opcaoId === opcao.id),
                              )
                            : [
                                ...(grupo.maximo === 1
                                  ? atual.filter((e) => e.grupoId !== grupo.id)
                                  : atual),
                                { grupoId: grupo.id, opcaoId: opcao.id },
                              ],
                        )
                      }
                    />
                    <span className="min-w-0 flex-1">{opcao.nome}</span>
                    <span className="shrink-0 font-medium">
                      {opcao.acrescimo > 0 ? `+ ${moeda(opcao.acrescimo)}` : "Sem acréscimo"}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          ))}
        </div>
        <label className="mt-4 text-sm font-medium" htmlFor="obs-item">
          Observação deste preparo
        </label>
        <textarea
          id="obs-item"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Ex.: sem cebola. Para outro preparo, adicione o produto novamente."
          className="mt-1 w-full shrink-0 rounded-xl border bg-transparent p-3 text-sm"
          style={{ borderColor: "var(--ms-border)" }}
        />
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            aria-label="Diminuir quantidade"
            disabled={quantidade <= 1}
            onClick={() => setQuantidade((q) => q - 1)}
            className="grid h-11 w-11 place-items-center rounded-full border disabled:opacity-40"
          >
            <Minus size={16} />
          </button>
          <span aria-live="polite" className="min-w-5 text-center font-semibold">
            {quantidade}
          </span>
          <button
            type="button"
            aria-label="Aumentar quantidade"
            disabled={quantidade >= Math.min(30, produto.estoque ?? 30)}
            onClick={() => setQuantidade((q) => q + 1)}
            className="grid h-11 w-11 place-items-center rounded-full border disabled:opacity-40"
          >
            <Plus size={16} />
          </button>
        </div>
        {(calculo.erro || aviso) && (
          <p role="status" className="mt-3 text-sm">
            {calculo.erro || aviso}
          </p>
        )}
        <button
          type="button"
          disabled={!disponivel || Boolean(calculo.erro)}
          onClick={() => {
            if (onAdicionar(escolhas, nota, quantidade)) onFechar();
            else setAviso("Quantidade indisponível. Revise o que já está no carrinho.");
          }}
          className="mt-3 min-h-12 shrink-0 rounded-xl px-4 text-sm font-semibold disabled:opacity-50"
          style={{ background: primaria, color: contraste(primaria) }}
        >
          {disponivel
            ? `Adicionar ${quantidade} · ${moeda(calculo.preco * quantidade)}`
            : "Indisponível no momento"}
        </button>
      </section>
    </div>
  );
}
