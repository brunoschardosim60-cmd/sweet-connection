# Nexa — Mini-sites profissionais

Plataforma para criar, editar e publicar mini-sites profissionais. O painel usa autenticação real e
persistência em um projeto Supabase externo; clientes, rascunhos, versões, formulários, mídias e
métricas são isolados por conta com Row Level Security (RLS).

## Estado atual

- Cadastro, login, recuperação de senha e proteção das rotas administrativas.
- Clientes e mini-sites persistidos no Supabase, sem `localStorage` como banco.
- Separação entre rascunho e snapshot publicado.
- Sites publicados em `/site/slug`; rascunhos e sites pausados não são expostos pela API pública.
- Formulários e métricas públicos gravados por RPC com validação e limites básicos contra abuso.
- Biblioteca de mídia no Supabase Storage, limitada a tipos permitidos e 10 MB por arquivo.
- Exportação, importação validada, duplicação com slug único e histórico de versões.
- Termos de uso e política de privacidade públicos, vinculados ao cadastro e ao rodapé.
- Google Analytics, Pixel da Meta e domínio personalizado continuam marcados como recursos futuros.
- As imagens de demonstração presentes no repositório são usadas apenas nos modelos e na biblioteca
  de imagens do sistema. O banco remoto não recebe clientes ou métricas fictícias automaticamente.

## Desenvolvimento

Requisitos: Node.js e npm.

```sh
npm ci
npm run dev
```

O servidor local abre em `http://127.0.0.1:8080`.

## Variáveis de ambiente

Copie `.env.example` e use somente a chave publicável no navegador. Nunca use uma chave
`service_role` ou `sb_secret_` no frontend.

```sh
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua_chave
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua_chave
VITE_PUBLIC_SITE_URL=https://seu-host-de-producao.com
```

`VITE_PUBLIC_SITE_URL` permite que o SSR gere canonical e Open Graph absolutos. A mesma origem deve
estar autorizada no Supabase em **Authentication → URL Configuration**, incluindo
`/recuperar-senha` nos Redirect URLs.

## Banco externo

As migrations versionadas ficam em `supabase/migrations`. Para aplicar novas migrations ao projeto
já vinculado:

```sh
npm exec -- supabase db push --linked
```

Não habilite Lovable Cloud: este projeto usa o Supabase externo configurado pelo proprietário.

## Verificações

```sh
npm run build
npm exec -- tsc --noEmit
npm run lint
npm audit
```

O build gera um worker compatível com Cloudflare em `.output`. Para publicar, autentique o Wrangler
na conta de destino e use o artefato gerado pelo Nitro.

Antes de abrir o produto para clientes:

1. substitua os contatos demonstrativos em `src/lib/nexa/brand.ts` pelos dados comerciais reais;
2. configure `VITE_PUBLIC_SITE_URL` com a origem HTTPS definitiva;
3. autorize essa origem e `/recuperar-senha` no Supabase Auth;
4. publique o worker em uma conta de hospedagem e faça o teste final no domínio real;
5. revise os documentos legais com o responsável jurídico do negócio.

## Sincronização com a Lovable

O branch `main` está conectado ao projeto Lovable. Commits enviados ao GitHub aparecem no editor;
não reescreva o histórico já publicado.
