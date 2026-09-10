import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Trash2, MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/nexa/brand";
import { fusoLoja, horariosPedido, lojaAbertaEm, rotuloAgendamento } from "@/lib/nexa/atendimento";
import { contraste } from "./estilo";
import {
  erroEtapaCheckout,
  rotuloTaxa,
  taxaConhecida,
  type CamposEntrega,
  type CotacaoEntrega,
  usaEntregaPorDistancia,
} from "@/lib/nexa/checkout";
import {
  formatarTelefonePedido,
  rotulosModalidade,
  rotulosPagamento,
  type Entrega,
  type ItemCarrinho,
  type Pagamento,
  type totaisCarrinho,
} from "@/lib/nexa/catalogo";
import { moeda } from "@/lib/nexa/utils";
import type { Site } from "@/lib/nexa/types";

const etapas = ["Recebimento", "Seus dados", "Pagamento", "Revisão"];
export function PainelCarrinho({
  site,
  itens,
  totais,
  entrega,
  setEntrega,
  pagamento,
  setPagamento,
  campos,
  setCampos,
  onAlterar,
  pedidosAtivos,
  enviando,
  retorno,
  onEnviar,
  cotacao,
  calculandoEntrega,
  onCalcularEntrega,
}: {
  site: Site;
  itens: ItemCarrinho[];
  totais: ReturnType<typeof totaisCarrinho>;
  entrega: Entrega;
  setEntrega: (e: Entrega) => void;
  pagamento: Pagamento | undefined;
  setPagamento: (p: Pagamento) => void;
  campos: CamposEntrega;
  setCampos: React.Dispatch<React.SetStateAction<CamposEntrega>>;
  onAlterar: (id: string, delta: number) => void;
  pedidosAtivos: boolean;
  enviando: boolean;
  retorno: string;
  onEnviar: () => void;
  cotacao?: CotacaoEntrega | null;
  calculandoEntrega?: boolean;
  onCalcularEntrega?: () => void;
}) {
  const [etapa, setEtapa] = useState(0);
  const [aviso, setAviso] = useState("");
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setAgora(new Date()), 30000);
    return () => window.clearInterval(t);
  }, []);
  const fechada = pedidosAtivos && !lojaAbertaEm(site, agora);
  const horarios = useMemo(() => horariosPedido(site, agora), [site, agora]);
  const porDistancia = entrega === "entrega" && usaEntregaPorDistancia(site);
  const cotacaoValida = cotacao && new Date(cotacao.expiraEm) > agora ? cotacao : null;
  const titulo = useRef<HTMLHeadingElement>(null);
  const primaria = site.aparencia.corPrimaria;
  const modalidades = site.comercio?.modalidadesPedido?.length
    ? site.comercio.modalidadesPedido
    : (["entrega", "retirada"] as Entrega[]);
  const modalidadesKey = modalidades.join(",");
  useEffect(() => {
    const permitidas = modalidadesKey.split(",") as Entrega[];
    if (!permitidas.includes(entrega)) setEntrega(permitidas[0] ?? "retirada");
  }, [modalidadesKey, entrega, setEntrega]);
  const pagamentos = site.comercio?.pagamentosAceitos?.length
    ? site.comercio.pagamentosAceitos
    : (Object.keys(rotulosPagamento) as Pagamento[]);
  const borda = { borderColor: "var(--ms-border)" };
  useEffect(() => {
    titulo.current?.focus({ preventScroll: true });
    titulo.current?.closest('[role="dialog"]')?.scrollTo({ top: 0 });
  }, [etapa]);
  const mudar = (passo: number) => {
    setAviso("");
    setEtapa(passo);
  };
  const horarioInvalido =
    campos.agendadoPara && !horarios.some((h) => h.valor === campos.agendadoPara);
  const erro = horarioInvalido
    ? "O horário selecionado não está mais disponível. Volte a Recebimento e escolha outro."
    : erroEtapaCheckout(etapa, site, itens, entrega, campos, pagamento, cotacaoValida, fechada);
  const campo = (nome: keyof CamposEntrega, rotulo: string, placeholder = "", limite = 160) => (
    <label className="block text-sm">
      {rotulo}
      <input
        value={campos[nome] ?? ""}
        maxLength={limite}
        placeholder={placeholder}
        onChange={(e) => {
          const valor = e.currentTarget.value;
          setCampos((c) => ({ ...c, [nome]: valor }));
        }}
        className="mt-1 min-h-12 w-full rounded-xl border bg-transparent px-3 text-sm"
        style={borda}
      />
    </label>
  );
  if (!itens.length)
    return (
      <div className="p-5 text-center">
        <h2 className="font-semibold">Seu pedido está vazio</h2>
        <p className="mt-2 text-sm opacity-70">Escolha um produto para começar.</p>
      </div>
    );
  return (
    <div className="space-y-4 p-1">
      <nav aria-label="Etapas do pedido" className="flex items-center gap-1.5">
        {etapas.map((nome, i) => (
          <button
            key={nome}
            type="button"
            disabled={i > etapa || enviando}
            onClick={() => mudar(i)}
            aria-current={etapa === i ? "step" : undefined}
            aria-label={`Etapa ${i + 1} de ${etapas.length}: ${nome}`}
            title={nome}
            className="min-h-11 flex-1 rounded-full px-1 text-[11px] font-semibold disabled:opacity-40"
            style={{
              background: i <= etapa ? primaria : "var(--ms-surface)",
              color: i <= etapa ? contraste(primaria) : "inherit",
              opacity: i < etapa ? 0.75 : undefined,
            }}
          >
            <span aria-hidden className="block truncate">
              {i + 1}
              <span className="hidden sm:inline">. {nome}</span>
            </span>
          </button>
        ))}
      </nav>
      <div>
        <p className="text-xs font-medium tracking-wide uppercase opacity-60">
          Etapa {etapa + 1} de {etapas.length}
        </p>
        <h2 ref={titulo} tabIndex={-1} className="text-xl font-semibold outline-none">
          {etapas[etapa]}
        </h2>
      </div>
      {(etapa === 0 || etapa === 3) && (
        <ul className="space-y-3">
          {itens.map((i) => (
            <li key={i.linhaId ?? i.produtoId} className="rounded-xl border p-3" style={borda}>
              <div className="flex justify-between gap-3 text-sm font-semibold">
                <span>
                  {i.quantidade}× {i.nome}
                </span>
                <span className="shrink-0">{moeda(i.preco * i.quantidade)}</span>
              </div>
              {i.observacao && (
                <p className="mt-1 text-xs leading-relaxed opacity-75">{i.observacao}</p>
              )}
              {i.erro && (
                <p role="alert" className="mt-2 text-xs">
                  {i.erro} Remova este preparo e personalize novamente.
                </p>
              )}
              {etapa === 0 && (
                <div className="mt-2 flex gap-2">
                  {[
                    { d: -1, label: `Remover uma unidade de ${i.nome}`, Icon: Minus },
                    { d: 1, label: `Adicionar uma unidade de ${i.nome}`, Icon: Plus },
                    { d: -i.quantidade, label: `Remover ${i.nome} do pedido`, Icon: Trash2 },
                  ].map(({ d, label, Icon }, n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={label}
                      onClick={() => onAlterar(i.linhaId ?? i.produtoId, d)}
                      className="grid h-11 w-11 place-items-center rounded-full border"
                      style={borda}
                    >
                      <Icon size={15} />
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {etapa === 0 && (
        <>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Como deseja receber?</legend>
            <div className="flex flex-wrap gap-2">
              {modalidades.map((op) => (
                <button
                  key={op}
                  type="button"
                  aria-pressed={entrega === op}
                  onClick={() => setEntrega(op)}
                  className="min-h-11 rounded-full border px-3 text-sm"
                  style={
                    entrega === op ? { background: primaria, color: contraste(primaria) } : borda
                  }
                >
                  {rotulosModalidade[op]}
                </button>
              ))}
            </div>
          </fieldset>
          {fechada && (
            <p role="status" className="rounded-xl border p-3 text-sm" style={borda}>
              Fechado agora.{" "}
              {horarios.length
                ? "Você pode agendar para o próximo horário de atendimento."
                : "Consulte a loja para combinar o atendimento."}
            </p>
          )}
          {(horarios.length > 0 || campos.agendadoPara) && (
            <label className="block text-sm">
              Quando deseja receber?
              <select
                value={campos.agendadoPara ?? ""}
                onChange={(e) => {
                  const agendadoPara = e.target.value;
                  setCampos((c) => ({ ...c, agendadoPara }));
                }}
                className="mt-1 min-h-12 w-full rounded-xl border px-3"
                style={{ ...borda, background: "var(--ms-surface)" }}
              >
                <option value="">{fechada ? "Escolha um horário" : "O quanto antes"}</option>
                {horarios.map((h) => (
                  <option key={h.valor} value={h.valor}>
                    {h.rotulo}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs opacity-65">
                Horário da loja ({fusoLoja(site)}). O agendamento aguarda aceite.
              </span>
            </label>
          )}
          {porDistancia && (
            <div className="space-y-3 rounded-xl border p-3" style={borda}>
              {campo("endereco", "Endereço completo para entrega", "Rua, número e cidade", 240)}
              {campo("bairro", "Bairro", "", 120)}
              <button
                type="button"
                disabled={calculandoEntrega}
                onClick={onCalcularEntrega}
                className="min-h-11 w-full rounded-xl border px-3 text-sm font-semibold"
                style={borda}
              >
                {calculandoEntrega ? "Calculando…" : "Calcular entrega"}
              </button>
              {cotacaoValida && (
                <p role="status" className="text-sm">
                  {cotacaoValida.distanciaKm.toLocaleString("pt-BR")} km por vias ·{" "}
                  {moeda(cotacaoValida.taxa)}
                </p>
              )}
              <p className="text-xs opacity-65">
                Distância calculada pelo Google Maps. Seu endereço será enviado ao Google para
                consultar a rota.
              </p>
              {cotacaoValida && (
                <a
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center text-sm underline"
                  href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(site.comercio?.enderecoOrigem ?? "")}&destination=${encodeURIComponent(`${campos.endereco}, ${campos.bairro}`)}&travelmode=driving`}
                >
                  Ver rota no Google Maps
                </a>
              )}
            </div>
          )}
          {entrega === "entrega" &&
            !porDistancia &&
            Boolean(site.comercio?.taxasPorBairro?.length) && (
              <label className="block text-sm">
                Bairro para calcular a taxa
                <input
                  list="bairros-pedido"
                  value={campos.bairro}
                  maxLength={120}
                  onChange={(e) => {
                    const bairro = e.currentTarget.value;
                    setCampos((c) => ({ ...c, bairro }));
                  }}
                  className="mt-1 min-h-12 w-full rounded-xl border bg-transparent px-3"
                  style={borda}
                />
                <datalist id="bairros-pedido">
                  {site.comercio?.taxasPorBairro?.map((t) => (
                    <option key={t.bairro} value={t.bairro} />
                  ))}
                </datalist>
              </label>
            )}
          <p className="text-sm opacity-75">
            Pedido mínimo: {totais.minimo > 0 ? moeda(totais.minimo) : "sem mínimo"}.
            {totais.abaixoDoMinimo ? ` Faltam ${moeda(totais.minimo - totais.subtotal)}.` : ""}
          </p>
        </>
      )}
      {etapa === 1 && (
        <div className="space-y-3">
          {campo("nome", "Seu nome", "", 120)}
          <label className="block text-sm">
            WhatsApp com DDD
            <input
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={campos.whatsapp}
              maxLength={20}
              placeholder="(00) 00000-0000"
              onChange={(e) => {
                const whatsapp = e.currentTarget.value;
                setCampos((c) => ({ ...c, whatsapp }));
              }}
              onBlur={(e) => {
                const whatsapp = formatarTelefonePedido(e.currentTarget.value);
                setCampos((c) => ({ ...c, whatsapp }));
              }}
              className="mt-1 min-h-12 w-full rounded-xl border bg-transparent px-3"
              style={borda}
            />
          </label>
          {entrega === "entrega" && (
            <>
              {campo("endereco", "Rua e número", "", 240)}
              {campo("bairro", "Bairro", "", 120)}
              {campo("complemento", "Complemento (opcional)")}
              {campo("referencia", "Referência (opcional)")}
            </>
          )}
          {entrega === "mesa" && (
            <>
              {campo("mesa", "Número da mesa", "Ex.: 12", 6)}
              {campo("pessoas", "Pessoas (opcional)", "", 3)}
            </>
          )}
          {entrega === "retirada" &&
            campo("horarioPreferido", "Horário preferido (opcional)", "Ex.: 19h30", 80)}
          {campo("observacao", "Observações do pedido (opcional)", "", 1000)}
        </div>
      )}
      {etapa === 2 && (
        <>
          <p className="text-sm opacity-75">Escolha como pretende pagar ao estabelecimento.</p>
          <div className="grid grid-cols-2 gap-2">
            {pagamentos.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={p === pagamento}
                onClick={() => setPagamento(p)}
                className="min-h-12 rounded-xl border px-3 text-sm"
                style={
                  pagamento === p ? { background: primaria, color: contraste(primaria) } : borda
                }
              >
                {rotulosPagamento[p]}
              </button>
            ))}
          </div>
          {pagamento === "dinheiro" &&
            campo("troco", "Troco para quanto? (opcional)", "Ex.: R$ 100,00", 80)}
          {pagamento === "pix" && site.comercio?.pixChave && (
            <div className="rounded-xl border p-3 text-sm" style={borda}>
              <p>Pix para {site.comercio.pixFavorecido || site.conteudo.nome}</p>
              <p className="mt-1 break-all">Chave: {site.comercio.pixChave}</p>
              {site.comercio.pixQrCode && (
                <img
                  src={site.comercio.pixQrCode}
                  alt="QR Code Pix do estabelecimento"
                  className="mt-2 h-32 w-32 object-contain"
                />
              )}
              <p className="mt-2 text-xs opacity-70">
                Combine o pagamento com a equipe. Confirmar o pedido não confirma o pagamento.
              </p>
            </div>
          )}
        </>
      )}
      {etapa === 3 && (
        <section className="rounded-xl border p-3 text-sm" style={borda}>
          <h3 className="font-semibold">Confira antes de enviar</h3>
          <p className="mt-2">
            {campos.nome} · {formatarTelefonePedido(campos.whatsapp)}
          </p>
          <p>
            {rotulosModalidade[entrega]}
            {entrega === "mesa" ? ` · Mesa ${campos.mesa}` : ""}
          </p>
          {entrega === "entrega" && (
            <p>
              {[campos.endereco, campos.bairro, campos.complemento, campos.referencia]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {entrega === "retirada" && campos.horarioPreferido && (
            <p>Preferência: {campos.horarioPreferido}</p>
          )}
          <p className="mt-2">
            Pagamento: {pagamento ? rotulosPagamento[pagamento] : "Não escolhido"}
            {pagamento === "dinheiro" && campos.troco ? ` · Troco para ${campos.troco}` : ""}
          </p>
          {campos.observacao && <p className="mt-2">Observação: {campos.observacao}</p>}
          {campos.agendadoPara && (
            <p className="mt-2 font-semibold">
              Agendar para {rotuloAgendamento(site, campos.agendadoPara)}
            </p>
          )}
        </section>
      )}
      <dl className="space-y-1 border-t pt-3 text-sm" style={borda}>
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{moeda(totais.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>{rotuloTaxa(site, entrega, campos.bairro, cotacaoValida)}</dt>
          <dd>
            {taxaConhecida(site, entrega, campos.bairro, cotacaoValida)
              ? moeda(totais.taxa)
              : "A calcular"}
          </dd>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <dt>
            {taxaConhecida(site, entrega, campos.bairro, cotacaoValida) ? "Total" : "Total parcial"}
          </dt>
          <dd>
            {moeda(
              taxaConhecida(site, entrega, campos.bairro, cotacaoValida)
                ? totais.total
                : totais.subtotal,
            )}
          </dd>
        </div>
      </dl>
      {(aviso || retorno) && (
        <p role="alert" className="text-sm font-medium">
          {aviso || retorno}
        </p>
      )}
      <div className="flex gap-2">
        {etapa > 0 && (
          <button
            type="button"
            disabled={enviando}
            onClick={() => mudar(etapa - 1)}
            className="min-h-12 rounded-xl border px-4 text-sm"
            style={borda}
          >
            Voltar
          </button>
        )}
        <button
          type="button"
          disabled={enviando || (etapa === 3 && !pedidosAtivos)}
          onClick={() => {
            if (erro) {
              setAviso(erro);
              return;
            }
            if (etapa < 3) mudar(etapa + 1);
            else onEnviar();
          }}
          className="min-h-12 flex-1 rounded-xl px-4 text-sm font-semibold disabled:opacity-50"
          style={{ background: primaria, color: contraste(primaria) }}
        >
          {enviando
            ? "Confirmando…"
            : etapa < 3
              ? "Continuar"
              : pedidosAtivos
                ? campos.agendadoPara
                  ? "Enviar pedido agendado"
                  : "Enviar pedido à loja"
                : "Prévia · não envia pedidos"}
        </button>
      </div>
      {site.conteudo.whatsapp && (
        <a
          href={
            pedidosAtivos
              ? whatsappLink(site.conteudo.whatsapp, "Olá! Preciso de ajuda com meu pedido.")
              : undefined
          }
          aria-disabled={!pedidosAtivos}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 items-center justify-center gap-2 text-sm underline"
        >
          <MessageCircle size={16} /> Entrar em contato com a loja
        </a>
      )}
      {etapa === 3 && (
        <p className="text-xs opacity-65">
          {pedidosAtivos
            ? "Seu pedido será enviado à equipe. O pagamento é combinado com o estabelecimento."
            : "Você está testando uma demonstração. Nenhum pedido será enviado."}
        </p>
      )}
    </div>
  );
}
