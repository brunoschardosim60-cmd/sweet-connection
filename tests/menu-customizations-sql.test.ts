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
      create role anon; create role authenticated; create role service_role; create schema auth;
      alter default privileges in schema public grant execute on functions to anon, authenticated;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz default now());
      insert into auth.users(id,email) values ('00000000-0000-4000-8000-000000000001','owner@test.invalid'),('00000000-0000-4000-8000-000000000002','operator@test.invalid'),('00000000-0000-4000-8000-000000000003','other@test.invalid');
      create table minisites(id uuid primary key default gen_random_uuid(),owner_id uuid,slug text,status text,published_content jsonb,expires_at timestamptz);
      create function nexa_plan_allows_public_site(uuid) returns boolean language sql as 'select true';
      create schema extensions;
      -- Hash não é exercitado: os testes de formulário usam fingerprint nulo.
      create function extensions.digest(text,text) returns bytea language sql as 'select null::bytea';
      create table form_submissions(id uuid default gen_random_uuid(),minisite_id uuid,payload jsonb,origin text,fingerprint_hash text,created_at timestamptz default now());
      create table analytics_events(minisite_id uuid,event_type text,target text,source text,session_hash text);
      create table mesas_cardapio(id uuid primary key,minisite_id uuid,ativa boolean,numero integer);
      create table pedidos_cardapio(id uuid primary key default gen_random_uuid(),codigo serial,minisite_id uuid,mesa_id uuid,modalidade text,itens jsonb,subtotal numeric,taxa_entrega numeric,total numeric,nome text,telefone text,endereco text,bairro text,complemento text,referencia text,observacao text,horario_preferido text,pessoas integer,pagamento text,troco text,chave_idempotencia uuid,tracking_token uuid default gen_random_uuid(),status text default 'novo',created_at timestamptz default now(),unique(minisite_id,chave_idempotencia));
      alter table minisites add column draft_content jsonb, add column created_at timestamptz default now();
      alter table pedidos_cardapio add column updated_at timestamptz default now();
      create type nexa_submission_status as enum ('novo','lido','arquivado');
      alter table form_submissions add column status nexa_submission_status default 'novo';
      alter table analytics_events add column occurred_at timestamptz default now();
      create table agendamentos(id uuid primary key default gen_random_uuid(),minisite_id uuid,data date,hora text,servico text,nome text,telefone text,observacao text,status text default 'confirmado');
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
    for (const arquivo of [
      "20260908040000_checkout_scheduling_delivery.sql",
      "20260908040100_scheduled_order_inventory.sql",
      "20260908041000_business_operations.sql",
      "20260910040000_operation_form_labels.sql",
    ])
      await db.exec(
        readFileSync(new URL(`../supabase/migrations/${arquivo}`, import.meta.url), "utf8"),
      );
    await db.exec(
      `alter table minisites enable row level security; grant select on minisites to authenticated; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated; create policy owner_only on minisites for select to authenticated using(owner_id=auth.uid());`,
    );
  }, 30000);
  beforeEach(async () => {
    await db.exec("reset role; truncate pedidos_cardapio,estoque_cardapio,minisites cascade;");
    await db.exec(
      "select set_config('test.uid','',false); truncate cotacoes_limites,agendamentos,form_submissions;",
    );
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
  const pedirDados = (dados: Record<string, unknown>, chave: string | null = null) =>
    db.query<{
      pedido: {
        id: string;
        status: string;
        total: number;
        trackingToken: string;
        repetido?: boolean;
      };
    }>(
      "select nexa_criar_pedido_cardapio_v2('teste',$1::jsonb,'entrega',$2::jsonb,$3::uuid) as pedido",
      [
        JSON.stringify([item]),
        JSON.stringify({
          nome: "Cliente teste",
          whatsapp: "11999999999",
          endereco: "Rua Teste, 10",
          bairro: "Centro",
          pagamento: "pix",
          ...dados,
        }),
        chave,
      ],
    );
  const configurar = async (comercio: Record<string, unknown>, horarios?: unknown[]) =>
    db.query("update minisites set published_content=$1::jsonb", [
      JSON.stringify({
        ...conteudo,
        comercio: { ...conteudo.comercio, ...comercio },
        ...(horarios ? { conteudo: { horarios } } : {}),
      }),
    ]);
  const usuario = async (n: number) => {
    await db.exec("reset role");
    await db.query("select set_config('test.uid',$1,false)", [
      `00000000-0000-4000-8000-00000000000${n}`,
    ]);
    await db.exec("set role authenticated");
  };
  it("novo pedido aguarda aceite e não é confirmado automaticamente", async () => {
    expect((await pedirDados({})).rows[0]?.pedido.status).toBe("novo");
  });
  it("bloqueia pedido imediato fechado e aceita somente horário futuro aberto", async () => {
    const instante = (
      await db.query<{ data: string }>(
        "select (date_trunc('day',now() at time zone 'America/Sao_Paulo')+interval '1 day 12 hours') at time zone 'America/Sao_Paulo' as data",
      )
    ).rows[0]!.data;
    const dia = (new Date(instante).getUTCDay() + 6) % 7;
    const horarios = Array.from({ length: 7 }, (_, i) => ({
      fechado: i !== dia,
      abre: "11:00",
      fecha: "14:00",
    }));
    await configurar({ aceitarAgendamento: true }, horarios);
    await expect(pedirDados({})).rejects.toThrow("store_closed");
    await expect(pedirDados({ agendadoPara: "2000-01-01T15:00:00Z" })).rejects.toThrow(
      "invalid_schedule",
    );
    const result = await pedirDados({ agendadoPara: new Date(instante).toISOString() });
    expect(result.rows[0]?.pedido.status).toBe("novo");
    expect((await db.query("select agendado_para from pedidos_cardapio")).rows[0]).toHaveProperty(
      "agendado_para",
    );
    await configurar({ aceitarAgendamento: false }, horarios);
    await expect(pedirDados({ agendadoPara: new Date(instante).toISOString() })).rejects.toThrow(
      "invalid_schedule",
    );
  });
  it("calcula janela noturna no fuso da loja e respeita o instante de fechamento", async () => {
    const c = {
      conteudo: {
        horarios: Array.from({ length: 7 }, (_, i) => ({
          fechado: i !== 0,
          abre: "22:00",
          fecha: "02:00",
        })),
      },
      comercio: { fusoHorario: "America/Manaus" },
    };
    for (const [instant, aberta] of [
      ["2026-09-08T05:59:00Z", true],
      ["2026-09-08T06:00:00Z", false],
    ] as const) {
      const r = await db.query<{ aberta: boolean }>(
        "select nexa_loja_aberta($1::jsonb,$2::timestamptz) aberta",
        [JSON.stringify(c), instant],
      );
      expect(r.rows[0]?.aberta).toBe(aberta);
    }
  });
  it("limita cotações no banco e mantém tabelas/chamadas privadas", async () => {
    for (let i = 0; i < 3; i++) {
      const r = await db.query<{ ok: boolean }>("select nexa_limite_cotacao('test',2,60) ok");
      expect(r.rows[0]?.ok).toBe(i < 2);
    }
    await db.exec("set role anon");
    await expect(db.query("select * from cotacoes_entrega")).rejects.toThrow("permission denied");
    await expect(db.query("select nexa_limite_cotacao('test',999,60)")).rejects.toThrow(
      "permission denied",
    );
    await expect(db.query("select nexa_operacao_sites()")).rejects.toThrow("permission denied");
  });
  it("taxa por distância exige cotação íntegra, expirada ou alterada é rejeitada", async () => {
    await configurar({
      calculoEntrega: "distancia",
      enderecoOrigem: "Origem",
      faixasDistancia: [{ ateKm: 5, taxa: 12 }],
    });
    await expect(pedirDados({ taxaEntrega: 0 })).rejects.toThrow("invalid_delivery_quote");
    const cotar = async () => {
      const r = await db.query<{ id: string }>(
        "insert into cotacoes_entrega(minisite_id,endereco,bairro,configuracao,taxa) select id,'Rua Teste, 10','Centro',published_content->'comercio',12 from minisites returning id",
      );
      return r.rows[0]!.id;
    };
    const id = await cotar();
    await expect(pedirDados({ cotacaoId: id, endereco: "Outro endereço" })).rejects.toThrow(
      "invalid_delivery_quote",
    );
    await db.query("update cotacoes_entrega set expires_at=now()-interval '1 minute' where id=$1", [
      id,
    ]);
    await expect(pedirDados({ cotacaoId: id })).rejects.toThrow("invalid_delivery_quote");
    const valido = await cotar();
    const chave = "00000000-0000-4000-8000-000000000099";
    expect(
      (await pedirDados({ cotacaoId: valido, taxaEntrega: 0 }, chave)).rows[0]?.pedido.total,
    ).toBe(50);
    expect((await pedirDados({ cotacaoId: valido }, chave)).rows[0]?.pedido.repetido).toBe(true);
    await expect(pedirDados({ cotacaoId: valido })).rejects.toThrow("invalid_delivery_quote");
  });
  it("modo bairro não aceita região não cadastrada", async () => {
    await configurar({ calculoEntrega: "bairro", taxasPorBairro: [{ bairro: "Centro", taxa: 4 }] });
    expect((await pedirDados({})).rows[0]?.pedido.total).toBe(42);
    await expect(pedirDados({ bairro: "Fora" })).rejects.toThrow("outside_delivery_area");
  });
  it("isola operação por loja, sem editor, e revoga acesso imediatamente", async () => {
    await db.exec(
      "update minisites set owner_id='00000000-0000-4000-8000-000000000001';insert into minisites(slug,status,owner_id) values('outra','publicado','00000000-0000-4000-8000-000000000003')",
    );
    const sites = (await db.query<{ id: string; slug: string }>("select id,slug from minisites"))
      .rows;
    const id = sites.find((s) => s.slug === "teste")!.id;
    const outra = sites.find((s) => s.slug === "outra")!.id;
    const pedido = (await pedirDados({})).rows[0]!.pedido;
    await db.query(
      "update minisites set published_content=published_content || $1::jsonb where id=$2",
      [JSON.stringify({ formulario: { campos: [{ id: "c_aleatorio", rotulo: "Nome" }] } }), id],
    );
    await usuario(1);
    await db.query("select nexa_operacao_acessos($1,'operator@test.invalid')", [id]);
    await usuario(2);
    const lista = await db.query<{ sites: { id: string }[] }>("select nexa_operacao_sites() sites");
    expect(lista.rows[0]?.sites.map((s) => s.id)).toEqual([id]);
    expect((await db.query("select * from minisites")).rows).toHaveLength(0);
    await expect(db.query("select nexa_operacao_dados($1)", [id])).resolves.toBeDefined();
    const operacao = await db.query<{
      dados: { camposFormulario: { id: string; rotulo: string }[] };
    }>("select nexa_operacao_dados($1) dados", [id]);
    expect(operacao.rows[0]?.dados.camposFormulario).toEqual([
      { id: "c_aleatorio", rotulo: "Nome" },
    ]);
    await expect(db.query("select nexa_operacao_dados($1)", [outra])).rejects.toThrow(
      "not_allowed",
    );
    await expect(
      db.query("select nexa_operacao_acessos($1,'other@test.invalid')", [id]),
    ).rejects.toThrow("not_allowed");
    await expect(
      db.query("select nexa_atualizar_status_pedido($1,'concluido')", [pedido.id]),
    ).rejects.toThrow("invalid_transition");
    await expect(
      db.query("select nexa_atualizar_status_pedido($1,'aceito')", [pedido.id]),
    ).resolves.toBeDefined();
    await usuario(1);
    await db.query("select nexa_operacao_acessos($1,null,'00000000-0000-4000-8000-000000000002')", [
      id,
    ]);
    await usuario(2);
    await expect(db.query("select nexa_operacao_dados($1)", [id])).rejects.toThrow("not_allowed");
    await expect(
      db.query("select nexa_atualizar_status_pedido($1,'preparo')", [pedido.id]),
    ).rejects.toThrow("not_allowed");
  });
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
