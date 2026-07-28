# Estrutura de Pastas e Arquivos

## Árvore completa

```text
Formula-One-API/
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml              # Pipeline: install → lint → test → build
│
├── .vscode/
│   └── settings.json              # Formatação ao salvar, ESLint como fonte de verdade
│
├── docs/
│   ├── adr/
│   │   ├── 0001-stack-e-arquitetura.md
│   │   └── 0002-remocao-de-equipe.md
│   ├── api-contract.md            # Contrato dos endpoints
│   ├── deploy.md                  # Procedimento de deploy (Neon + Render)
│   ├── estrutura.md               # Este arquivo
│   └── roadmap.md                 # Planejamento e progresso
│
├── prisma/
│   ├── migrations/                # VERSIONADO — histórico de schema
│   │   └── 20260725192315_init/
│   │       └── migration.sql
│   ├── schema.prisma              # Models (sem `url` — Prisma 7)
│   └── seed.ts                    # dados reais de F1 (idempotente, via upsert)
│
├── src/
│   ├── config/                    # Env validado (Zod) + constantes da aplicação
│   │
│   ├── controllers/               # Recebe request, orquestra, devolve response
│   │   ├── driver.controller.ts
│   │   └── team.controller.ts
│   │
│   ├── data/                      # Dados estáticos (JSON/seed) — datasets fixos
│   │
│   ├── generated/                 # NÃO VERSIONADO — saída do `prisma generate`
│   │   └── prisma/
│   │
│   ├── lib/                       # Infraestrutura compartilhada
│   │   └── prisma.ts              # PrismaClient + adapter-pg (instância única)
│   │
│   ├── plugins/                   # Plugins Fastify encapsulados
│   │   ├── error-handler.ts       # Handler global de erros
│   │   ├── security.ts            # helmet, cors, rate-limit
│   │   └── swagger.ts             # Swagger + Swagger UI
│   │
│   ├── repositories/              # Único ponto que conhece o Prisma
│   │   ├── driver.repository.ts
│   │   └── team.repository.ts
│   │
│   ├── routes/                    # Registro de rotas + binding dos schemas
│   │   ├── driver.routes.ts
│   │   ├── team.routes.ts
│   │   └── health.routes.ts
│   │
│   ├── schemas/                   # Schemas Zod — fonte única de verdade
│   │   ├── driver.schema.ts
│   │   └── team.schema.ts
│   │
│   ├── services/                  # Regra de negócio (só onde ela existe)
│   │   └── driver.service.ts
│   │
│   ├── utils/                     # Funções puras e reutilizáveis (sem estado)
│   │
│   ├── app.ts                     # Monta a instância Fastify (sem escutar)
│   └── server.ts                  # Lê env, chama listen()
│
├── tests/
│   ├── helpers/
│   │   └── build-app.ts           # Instância de teste via app.inject()
│   ├── driver.test.ts
│   └── team.test.ts
│
├── .env                           # NÃO VERSIONADO — credenciais reais
├── .env.example                   # VERSIONADO — modelo sem segredos
├── .gitattributes                 # Normaliza fim de linha (LF) — importante no Windows
├── .gitignore
├── .prettierrc
├── docker-compose.yml             # PostgreSQL local (e API, a partir do Dia 6)
├── Dockerfile                     # Build multi-stage da API
├── eslint.config.mjs              # Flat config (ESLint 9+)
├── LICENSE
├── package.json
├── package-lock.json              # VERSIONADO — garante build reprodutível no CI
├── prisma.config.ts               # Conexão do CLI do Prisma (Prisma 7)
├── README.md
└── tsconfig.json
```

---

## Por que cada camada existe

O fluxo de uma requisição é linear e sempre no mesmo sentido:

```text
Request
  → routes/      valida o payload contra o schema Zod
  → controllers/ traduz HTTP em chamada de domínio
  → services/    aplica regra de negócio (quando existe)
  → repositories/ conversa com o banco
  → Prisma → PostgreSQL
```

### `routes/`

Registra os endpoints e amarra cada um ao seu schema Zod. Graças ao `fastify-type-provider-zod`, o mesmo schema serve para três coisas: validar em runtime, inferir o tipo TypeScript e gerar a documentação Swagger. Não há lógica aqui.

### `controllers/`

Fronteira do HTTP. É a única camada que conhece `request` e `reply`. Traduz o mundo HTTP para o mundo do domínio e devolve o status code correto. Sem regra de negócio, sem SQL.

### `services/`

**Só existe quando há regra de negócio real.** Esta é uma decisão deliberada: um service que apenas escreve `return repository.findAll()` é ruído, não arquitetura. Nesses casos o controller chama o repository diretamente.

Exemplo de regra que **justifica** um service: ao criar um piloto, verificar se a equipe existe e se o número do carro já está em uso, antes de persistir.

### `repositories/`

Única camada que importa o Prisma. Isolar o acesso a dados aqui significa que trocar de ORM afetaria só esta pasta. Também é o que torna os testes possíveis sem acoplar ao banco.

### `schemas/`

Os schemas Zod ficam separados porque são consumidos por routes (validação), controllers/services (tipos via `z.infer`) e Swagger (documentação). São a fonte única de verdade sobre o formato dos dados.

### `plugins/`

O Fastify tem um sistema de plugins com encapsulamento. Configurações transversais (segurança, erros, documentação) ficam aqui em vez de poluir o `app.ts`.

### `lib/`

Infraestrutura compartilhada que não é regra de negócio. Hoje contém apenas a instância única do `PrismaClient` — importante que seja única, para não abrir múltiplos pools de conexão.

### `config/`

Configuração da aplicação em um só lugar. Concentra a leitura e a **validação das variáveis de ambiente** (via schema Zod, com a app falhando cedo se algo estiver ausente ou malformado) e as constantes gerais. O `server.ts` importa daqui em vez de ler `process.env` espalhado pelo código.

### `data/`

Dados **estáticos** que acompanham o código: datasets fixos, listas de referência e o material consumido pelo `prisma/seed.ts`. Não confundir com `repositories/` — aqui não há acesso ao banco, apenas conteúdo versionado em JSON/TS.

### `utils/`

Funções **puras e reutilizáveis** — sem estado, sem acesso a banco e sem regra de negócio. Se uma função precisa do Prisma ou decide algo do domínio, ela não pertence aqui (vai para `repositories/` ou `services/`).

---

## Separação entre `app.ts` e `server.ts`

Não é preciosismo, é o que torna os testes viáveis:

- **`app.ts`** monta e devolve a instância do Fastify com tudo registrado, **sem chamar `listen()`**.
- **`server.ts`** lê as variáveis de ambiente e chama `listen()`.

Assim os testes importam o `app.ts` e usam `app.inject()` para disparar requisições **sem abrir porta de rede**. Testes ficam mais rápidos, não dão conflito de porta no CI e não precisam de `supertest`.

---

## Convenção de nomes

| Tipo | Padrão | Exemplo |
| --- | --- | --- |
| Arquivos de código | `kebab-case.tipo.ts` | `driver.repository.ts` |
| Testes | `nome.test.ts` | `driver.test.ts` |
| Pastas | `kebab-case`, plural | `repositories/` |
| Tabelas no banco | `snake_case`, plural (via `@@map`) | `drivers` |
| Rotas | `kebab-case`, plural | `/drivers` |

Os models do Prisma usam `PascalCase` no singular (`Driver`) e são mapeados para tabelas em `snake_case` plural (`drivers`) através do `@@map`. Isso mantém o código idiomático em TypeScript e o banco idiomático em SQL.

---

## O que é versionado e o que não é

| Caminho | Versionado? | Por quê |
| --- | --- | --- |
| `prisma/migrations/` | **Sim** | O Render depende delas para aplicar o schema no build |
| `src/generated/` | **Não** | Gerado por `prisma generate`; recriado a cada build |
| `.env` | **Não** | Contém credenciais reais do Neon |
| `.env.example` | **Sim** | Documenta quais variáveis existem, sem segredos |
| `package-lock.json` | **Sim** | Sem ele o `npm ci` não funciona no CI |
| `dist/` | **Não** | Saída de build |

> **Atenção:** como `src/generated/` não vai para o Git, todo ambiente de build (CI, Docker, Render) precisa rodar `prisma generate` **antes** do `tsc`. Se não rodar, a compilação falha com erro de módulo não encontrado.
