import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Banco PostgreSQL em memória. Não usa credenciais, contas ou pedidos reais.
describe("RPC de pedidos v2 em PostgreSQL isolado", () => {
  const db = new PGlite();
  const produto = {
    id: "burger",
    nome: "Burger",
    preco: 30,
    disponivel: true,
    estoque: 4,
    variacoes: [],
    personalizacoes: [
      {
        id: "tamanho",
        nome: "Tamanho",
        minimo: 1,
        maximo: 1,
        opcoes: [
          { id: "normal", nome: "Normal", acrescimo: 0 },
          { id: "duplo", nome: "Duplo", acrescimo: 8 },
        ],
      },
    ],
  };
  const escolha = [{ grupoId: "tamanho", opcaoId: "duplo" }];
  const item = { produtoId: "burger", quantidade: 1, escolhas: escolha, preco: 0.01 };
  const conteudo = {
    produtos: [produto],
    comercio: {
      taxaEntrega: 7,
      pedidoMinimo: 0,
      modalidadesPedido: ["entrega", "retirada"],
      pagamentosAceitos: ["pix"],
    },
  };
  beforeAll(async () => {
    await db.exec(`
      create role anon; create role authenticated; create schema auth;
      alter default privileges in schema public grant execute on functions to anon, authenticated;
      create function auth.uid() returns uuid language sql as 'select null::uuid';
      create table minisites(id uuid primary key default gen_random_uuid(),owner_id uuid,slug text,status text,published_content jsonb,expires_at timestamptz);
      create function nexa_plan_allows_public_site(uuid) returns boolean language sql as 'select true';
      create schema extensions;
      -- Hash não é exercitado: os testes de formulário usam fingerprint nulo.
      create function extensions.digest(text,text) returns bytea language sql as 'select null::bytea';
      create table form_submissions(id uuid default gen_random_uuid(),minisite_id uuid,payload jsonb,origin text,fingerprint_hash text,created_at timestamptz default now());
      create table analytics_events(minisite_id uuid,event_type text,target text,source text,session_hash text);
      create table mesas_cardapio(id uuid primary key,minisite_id uuid,ativa boolean,numero integer);
      create table pedidos_cardapio(id uuid primary key default gen_random_uuid(),codigo serial,minisite_id uuid,mesa_id uuid,modalidade text,itens jsonb,subtotal numeric,taxa_entrega numeric,total numeric,nome text,telefone text,endereco text,bairro text,complemento text,referencia text,observacao text,horario_preferido text,pessoas integer,pagamento text,troco text,chave_idempotencia uuid,tracking_token uuid default gen_random_uuid(),status text default 'novo',created_at timestamptz default now(),unique(minisite_id,chave_idempotencia));
    `);
    await db.exec(
      readFileSync(
        new URL("../supabase/migrations/20260823060000_live_menu_inventory.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(
      "create trigger validar_estoque before insert on pedidos_cardapio for each row execute function nexa_validar_itens_disponiveis_pedido();",
    );
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/20260907190000_menu_customizations_v2.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      readFileSync(
        new URL("../supabase/migrations/20260907191000_form_selected_service.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/20260907192000_menu_option_helper_permissions.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
  }, 30000);
  beforeEach(async () => {
    await db.exec("reset role; truncate pedidos_cardapio,estoque_cardapio,minisites cascade;");
    await db.query(
      "insert into minisites(slug,status,published_content) values ('teste','publicado',$1::jsonb)",
      [JSON.stringify(conteudo)],
    );
  });
  afterAll(async () => {
    await db.close();
  });
  it("mantém o cálculo interno privado mesmo com permissões padrão do Supabase", async () => {
    const r = await db.query<{ permitido: boolean }>(
      "select has_function_privilege('anon','nexa_calcular_opcoes_produto(jsonb,jsonb)','EXECUTE') as permitido",
    );
    expect(r.rows[0]?.permitido).toBe(false);
  });
  const pedir = (itens: unknown[], modalidade = "entrega", chave: string | null = null) =>
    db.query<{ pedido: { total: number; repetido: boolean } }>(
      "select nexa_criar_pedido_cardapio_v2('teste',$1::jsonb,$2,$3::jsonb,$4::uuid) as pedido",
      [
        JSON.stringify(itens),
        modalidade,
        JSON.stringify({
          nome: "Cliente teste",
          whatsapp: "11999999999",
          endereco: "Rua Teste, 10",
          bairro: "Centro",
          pagamento: "pix",
        }),
        chave,
      ],
    );
  it("preserva somente serviços publicados no formulário e mantém campos obrigatórios", async () => {
    await db.query("update minisites set published_content=$1::jsonb", [
      JSON.stringify({
        servicos: [{ nome: "Manutenção" }],
        formulario: { campos: [{ id: "nome", obrigatorio: true }] },
      }),
    ]);
    await db.query("select submit_minisite_form('teste',$1::jsonb,'teste',null)", [
      JSON.stringify({ nome: "Cliente Teste", servico_interesse: "Manutenção" }),
    ]);
    expect(
      (
        await db.query<{ payload: Record<string, string> }>(
          "select payload from form_submissions order by created_at desc limit 1",
        )
      ).rows[0]?.payload.servico_interesse,
    ).toBe("Manutenção");
    await db.query("select submit_minisite_form('teste',$1::jsonb,'teste',null)", [
      JSON.stringify({ nome: "Outro Teste", servico_interesse: "Serviço inventado" }),
    ]);
    expect(
      (
        await db.query<{ payload: Record<string, string> }>(
          "select payload from form_submissions where payload->>'nome'='Outro Teste'",
        )
      ).rows[0]?.payload,
    ).not.toHaveProperty("servico_interesse");
    await expect(
      db.query("select submit_minisite_form('teste',$1::jsonb,'teste',null)", [
        JSON.stringify({ servico_interesse: "Manutenção" }),
      ]),
    ).rejects.toThrow("required_field_missing");
  });
  it("ignora preço manipulado e mantém taxa padrão quando bairro não tem regra", async () => {
    await db.exec("set role anon;");
    const r = await pedir([item]);
    expect(r.rows[0]?.pedido.total).toBe(45);
  });
  it("rejeita opções ausentes, inválidas ou repetidas", async () => {
    for (const escolhas of [
      [],
      [{ grupoId: "tamanho", opcaoId: "falso" }],
      [...escolha, ...escolha],
    ])
      await expect(pedir([{ ...item, escolhas }])).rejects.toThrow("invalid_options");
  });
  it("mantém duas observações para o mesmo produto", async () => {
    await pedir([
      { ...item, observacaoLivre: "Sem cebola" },
      { ...item, observacaoLivre: "Completo" },
    ]);
    const r = await db.query<{ itens: { observacao: string }[] }>(
      "select itens from pedidos_cardapio",
    );
    expect(r.rows[0]?.itens).toHaveLength(2);
    expect(r.rows[0]?.itens[0]?.observacao).toBe("Tamanho: Duplo · Sem cebola");
    expect(r.rows[0]?.itens[1]?.observacao).toBe("Tamanho: Duplo · Completo");
  });
  it("estoque é compartilhado e falha atômica não consome unidades", async () => {
    await expect(
      pedir([
        { ...item, quantidade: 3 },
        { ...item, quantidade: 2 },
      ]),
    ).rejects.toThrow("invalid_product");
    expect((await db.query("select * from pedidos_cardapio")).rows).toHaveLength(0);
    await expect(pedir([{ ...item, quantidade: 4 }])).resolves.toBeDefined();
  });
  it("repetir a mesma chave não cria outro pedido nem desconta estoque duas vezes", async () => {
    const chave = "00000000-0000-4000-8000-000000000001";
    await pedir([item], "retirada", chave);
    const r = await pedir([item], "retirada", chave);
    expect(r.rows[0]?.pedido.repetido).toBe(true);
    expect(
      (await db.query<{ quantidade: number }>("select quantidade from estoque_cardapio")).rows[0]
        ?.quantidade,
    ).toBe(3);
  });
  it("não aceita entrega com taxa indefinida", async () => {
    await db.query("update minisites set published_content=$1::jsonb", [
      JSON.stringify({
        ...conteudo,
        comercio: { ...conteudo.comercio, taxaEntregaDefinida: false },
      }),
    ]);
    await expect(pedir([item])).rejects.toThrow("delivery_fee_pending");
    await expect(pedir([item], "retirada")).resolves.toBeDefined();
  });
});
