import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PhoneFrame } from "@/components/PhoneFrame";
import { MiniSite } from "@/components/minisite/MiniSite";
import { useNexa } from "@/lib/nexa/hooks";
import { criarSite } from "@/lib/nexa/factory";
import { modelos } from "@/lib/nexa/modelos";
import { estados, segmentos } from "@/lib/nexa/segmentos";
import { slugify, telefoneMask } from "@/lib/nexa/utils";
import type { Cliente, SegmentoId } from "@/lib/nexa/types";

export const Route = createFileRoute("/painel/novo")({
  head: () => ({
    meta: [
      { title: "Novo mini-site — Nexa" },
      { name: "description", content: "Crie um novo mini-site para um cliente em três passos." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Novo mini-site — Nexa" },
      { property: "og:description", content: "Cadastro do cliente, escolha do modelo e endereço." },
    ],
  }),
  component: NovoSite,
});

const passos = ["Cliente", "Modelo", "Endereço"];

function NovoSite() {
  const { sites, store } = useNexa();
  const navigate = useNavigate();
  const [passo, setPasso] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const [cliente, setCliente] = useState<Cliente>({
    empresa: "",
    segmento: "alimentacao",
    responsavel: "",
    telefone: "",
    email: "",
    cidade: "",
    estado: "SP",
  });
  const [modeloId, setModeloId] = useState(modelos[0]!.id);
  const [slug, setSlug] = useState("");

  const sugeridos = useMemo(
    () => modelos.filter((m) => m.segmento === cliente.segmento),
    [cliente.segmento],
  );
  const lista = sugeridos.length > 0 ? sugeridos : modelos;

  const slugFinal = slug || slugify(cliente.empresa);
  const slugEmUso = sites.some((s) => s.slug === slugFinal);

  const previa = useMemo(
    () =>
      criarSite(
        { ...cliente, empresa: cliente.empresa || "Seu negócio" },
        modeloId,
        slugFinal || "previa",
      ),
    [cliente, modeloId, slugFinal],
  );

  const podeAvancar =
    passo === 0
      ? cliente.empresa.trim().length > 1 && cliente.telefone.replace(/\D/g, "").length >= 10
      : passo === 1
        ? !!modeloId
        : slugFinal.length > 2 && !slugEmUso;

  const criar = async () => {
    if (!podeAvancar) return;
    setSalvando(true);
    const site = criarSite(cliente, modeloId, slugFinal);
    await store.adicionarSite(site);
    toast.success("Mini-site criado", { description: "Agora personalize no editor." });
    void navigate({ to: "/painel/editor/$id", params: { id: site.id } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Criar novo mini-site</h1>
          <p className="text-sm text-muted-foreground">
            Três passos rápidos e o cliente já pode ser editado e publicado.
          </p>
        </div>
        <Link
          to="/painel/clientes"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          Cancelar
        </Link>
      </div>

      <ol className="flex flex-wrap items-center gap-3">
        {passos.map((p, i) => (
          <li key={p} className="flex items-center gap-2">
            <span
              className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                i <= passo ? "bg-ink text-ink-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {i < passo ? <Check size={14} /> : i + 1}
            </span>
            <span className={i === passo ? "text-sm font-semibold" : "text-sm text-muted-foreground"}>
              {p}
            </span>
            {i < passos.length - 1 && <span className="mx-1 h-px w-8 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="surface p-5 sm:p-6">
          {passo === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                rotulo="Nome da empresa"
                valor={cliente.empresa}
                onChange={(v) => setCliente({ ...cliente, empresa: v })}
                placeholder="Cantina Bella Massa"
              />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Segmento</span>
                <select
                  value={cliente.segmento}
                  onChange={(e) =>
                    setCliente({ ...cliente, segmento: e.target.value as SegmentoId })
                  }
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-ink"
                >
                  {segmentos.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </label>
              <Campo
                rotulo="Responsável"
                valor={cliente.responsavel}
                onChange={(v) => setCliente({ ...cliente, responsavel: v })}
                placeholder="Maria Silva"
              />
              <Campo
                rotulo="WhatsApp"
                valor={cliente.telefone}
                onChange={(v) => setCliente({ ...cliente, telefone: telefoneMask(v) })}
                placeholder="(11) 98888-1111"
              />
              <Campo
                rotulo="E-mail"
                valor={cliente.email}
                onChange={(v) => setCliente({ ...cliente, email: v })}
                placeholder="contato@empresa.com.br"
              />
              <div className="grid grid-cols-[1fr_100px] gap-3">
                <Campo
                  rotulo="Cidade"
                  valor={cliente.cidade}
                  onChange={(v) => setCliente({ ...cliente, cidade: v })}
                  placeholder="São Paulo"
                />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">UF</span>
                  <select
                    value={cliente.estado}
                    onChange={(e) => setCliente({ ...cliente, estado: e.target.value })}
                    className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-ink"
                  >
                    {estados.map((e) => (
                      <option key={e}>{e}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          {passo === 1 && (
            <div>
              <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles size={15} /> Modelos recomendados para este segmento
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {lista.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModeloId(m.id)}
                    className={`overflow-hidden rounded-2xl border text-left transition-all ${
                      modeloId === m.id
                        ? "border-ink ring-2 ring-lime"
                        : "border-border hover:-translate-y-0.5"
                    }`}
                  >
                    <img
                      src={m.imagem}
                      alt={`Modelo ${m.nome}`}
                      loading="lazy"
                      className="h-28 w-full object-cover"
                    />
                    <div className="p-3">
                      <p className="text-sm font-semibold">{m.nome}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {m.descricao}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {passo === 2 && (
            <div className="max-w-md space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Endereço do mini-site</span>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3">
                  <span className="text-sm text-muted-foreground">/site/</span>
                  <input
                    value={slugFinal}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    className="h-11 w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </label>
              {slugEmUso && (
                <p className="text-sm text-ember">Este endereço já está sendo usado.</p>
              )}
              <p className="text-sm text-muted-foreground">
                O mini-site é criado como rascunho. Você pode editar tudo e publicar quando quiser.
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
            <button
              type="button"
              disabled={passo === 0}
              onClick={() => setPasso((p) => p - 1)}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              <ArrowLeft size={15} /> Voltar
            </button>
            {passo < 2 ? (
              <button
                type="button"
                disabled={!podeAvancar}
                onClick={() => setPasso((p) => p + 1)}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ink-foreground disabled:opacity-40"
              >
                Continuar <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                disabled={!podeAvancar || salvando}
                onClick={() => void criar()}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ink-foreground disabled:opacity-40"
              >
                <Check size={15} /> Criar e editar
              </button>
            )}
          </div>
        </div>

        <div className="hidden justify-center lg:flex">
          <PhoneFrame>
            <MiniSite site={previa} compacto botaoFlutuante={false} />
          </PhoneFrame>
        </div>
      </div>
    </div>
  );
}

function Campo({
  rotulo,
  valor,
  onChange,
  placeholder,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{rotulo}</span>
      <input
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-ink"
      />
    </label>
  );
}
