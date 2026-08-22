import type { Cliente, SegmentoId } from "./types";

export type ClienteImportado = Cliente & { modeloId?: string; slug?: string; linha: number };

export type ResultadoImportacaoClientes = {
  clientes: ClienteImportado[];
  erros: string[];
};

const segmentos: SegmentoId[] = [
  "alimentacao",
  "beleza",
  "comercio",
  "servicos",
  "saude",
  "eventos",
  "imoveis",
  "transporte",
  "profissionais",
];

const normalizar = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

function separarLinha(linha: string, separador: string) {
  const campos: string[] = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i += 1) {
    const caractere = linha[i]!;
    if (caractere === '"') {
      if (aspas && linha[i + 1] === '"') {
        atual += '"';
        i += 1;
      } else aspas = !aspas;
    } else if (caractere === separador && !aspas) {
      campos.push(atual.trim());
      atual = "";
    } else atual += caractere;
  }
  campos.push(atual.trim());
  return campos;
}

function valor(linha: Record<string, string>, ...nomes: string[]) {
  return (
    nomes
      .map((nome) => linha[nome])
      .find((item) => item?.trim())
      ?.trim() ?? ""
  );
}

function segmento(valorOriginal: string): SegmentoId {
  const valorNormalizado = normalizar(valorOriginal);
  if (segmentos.includes(valorNormalizado as SegmentoId)) return valorNormalizado as SegmentoId;
  const porNome: Record<string, SegmentoId> = {
    alimentacao: "alimentacao",
    beleza: "beleza",
    beleza_estetica: "beleza",
    comercio: "comercio",
    loja: "comercio",
    servicos: "servicos",
    saude: "saude",
    eventos: "eventos",
    imoveis: "imoveis",
    transporte: "transporte",
    profissionais: "profissionais",
  };
  return porNome[valorNormalizado] ?? "servicos";
}

/** Lê uma planilha CSV sem depender de Excel; aceita vírgula ou ponto e vírgula. */
export function lerClientesCsv(texto: string): ResultadoImportacaoClientes {
  const linhas = texto
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((linha) => linha.trim());
  if (linhas.length < 2)
    return { clientes: [], erros: ["Inclua o cabeçalho e pelo menos um cliente."] };

  const separador =
    (linhas[0]!.match(/;/g)?.length ?? 0) >= (linhas[0]!.match(/,/g)?.length ?? 0) ? ";" : ",";
  const cabecalho = separarLinha(linhas[0]!, separador).map(normalizar);
  if (
    !cabecalho.some((campo) => ["empresa", "nome", "negocio", "estabelecimento"].includes(campo))
  ) {
    return { clientes: [], erros: ["A planilha precisa ter a coluna Empresa ou Nome."] };
  }

  const clientes: ClienteImportado[] = [];
  const erros: string[] = [];
  linhas.slice(1).forEach((textoLinha, indice) => {
    const linhaNumero = indice + 2;
    const campos = separarLinha(textoLinha, separador);
    const linha = Object.fromEntries(
      cabecalho.map((campo, posicao) => [campo, campos[posicao] ?? ""]),
    );
    const empresa = valor(linha, "empresa", "nome", "negocio", "estabelecimento");
    if (!empresa) {
      erros.push(`Linha ${linhaNumero}: informe a empresa.`);
      return;
    }
    const modeloId = valor(linha, "modelo", "modelo_id");
    const slug = valor(linha, "slug", "endereco");
    clientes.push({
      linha: linhaNumero,
      empresa,
      responsavel: valor(linha, "responsavel", "contato", "nome_responsavel"),
      telefone: valor(linha, "whatsapp", "telefone", "celular", "fone"),
      email: valor(linha, "email", "e_mail"),
      cidade: valor(linha, "cidade") || "Sua cidade",
      estado: valor(linha, "estado", "uf").toUpperCase() || "SP",
      segmento: segmento(valor(linha, "segmento", "categoria")),
      ...(modeloId ? { modeloId } : {}),
      ...(slug ? { slug } : {}),
    });
  });
  return { clientes, erros };
}

export function slugDoCliente(texto: string) {
  return normalizar(texto).replace(/_/g, "-").slice(0, 40) || "novo-site";
}

export const exemploClientesCsv = `Empresa;Responsável;WhatsApp;E-mail;Cidade;Estado;Segmento;Modelo;Slug
Studio Aurora;Marina Silva;11999998888;marina@studioaurora.com;São Paulo;SP;beleza;barbearia-premium;studio-aurora
Café Central;João Lima;21988887777;joao@cafecentral.com;Rio de Janeiro;RJ;alimentacao;restaurante-moderno;cafe-central`;
