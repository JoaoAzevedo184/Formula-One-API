# Estrutura de Pastas e Arquivos

## Árvore completa

```text
Formula-One-API/
│
├── .github/
│   └── workflows/
│       ├── ci.yml              # Pipeline: install → lint → test → build  
│       └── cd.yml              # Pipeline: install → lint → test → build
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
│   └── seed.ts                    # Dados reais de F1 (idempotente, via upsert)
│
├── src/
│   ├── config/                    # Env validado com Zod + constantes
│   │   └── env.ts
│   │
│   ├── controllers/               # Recebe request, orquestra, devolve response
│   │   ├── driver.controller.ts
│   │   └── team.controller.ts
│   │
│   ├── generated/                 # NÃO VERSIONADO — saída do `prisma generate`
│   │   └── prisma/
│   │
│   ├── lib/                       # Infraestrutura compartilhada
│   │   └── prisma.ts              # PrismaClient + adapter-pg (instância única)
│   │
│   ├── plugins/                   # Configuração transversal do Fastify
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
│   ├── app.ts                     # Monta a instância Fastify (sem escutar)
│   └── server.ts                  # Lê config, chama listen()
│
├── tests/
│   ├── helpers/
│   │   ├── build-app.ts           # Instância de teste via app.inject()
│   │   └── global-setup.ts        # Cria e migra o banco de teste
│   ├── driver.test.ts
│   └── team.test.ts
│
├── .dockerignore                  # Impede .env e node_modules de entrarem na imagem
├── .env                           # NÃO VERSIONADO — credenciais reais
├── .env.example                   # VERSIONADO — modelo sem segredos
├── .gitattributes                 # Normaliza fim de linha (LF) — importante no Windows
├── .gitignore
├── .prettierrc
├── docker-compose.yml             # PostgreSQL local (porta 5434) + API
├── Dockerfile                     # Build multi-stage da API
├── eslint.config.mjs              # Flat config (ESLint 9+)
├── LICENSE
├── package.json
├── package-lock.json              # VERSIONADO — garante build reprodutível no CI
├── prisma.config.ts               # Conexão do CLI do Prisma (Prisma 7)
├── README.md
├── tsconfig.json
└── vitest.config.ts               # `fileParallelism: false` + globalSetup
```

### Pastas deliberadamente ausentes

Durante o desenvolvimento foram criadas as pastas `src/data/` e `src/utils/`, e ambas foram **removidas** por permanecerem vazias.

O motivo é o mesmo princípio que dispensa services vazios (ADR 0001): estrutura sem conteúdo não é arquitetura, é ruído. Há ainda uma consequência prática — **o Git não versiona diretórios vazios**, então essas pastas não sobreviveriam a um clone, e a documentação passaria a descrever algo que ninguém mais enxerga.

- `data/` seria para datasets estáticos, mas os dados do seed vivem em `prisma/seed.ts`.
- `utils/` seria para funções puras, mas nenhuma surgiu. Quando surgir, cria-se a pasta.

---

## Por que cada camada existe

O fluxo de uma requisição é linear e sempre no mesmo sentido:

```text
Request
  → routes/       valida o payload contra o schema Zod
  → controllers/  traduz HTTP em chamada de domínio
  → repositories/ conversa com o banco
  → Prisma → PostgreSQL
```

### `routes/`
Registra os endpoints e amarra cada um ao seu schema Zod. Graças ao `fastify-type-provider-zod`, o mesmo schema serve para validar em runtime, inferir o tipo TypeScript e gerar a documentação Swagger. Não há lógica aqui.

### `controllers/`
Fronteira do HTTP. É a única camada que conhece `request` e `reply`. Traduz o mundo HTTP para o mundo do domínio e devolve o status code correto.

Desde o Dia 5, os controllers **não capturam erros do Prisma** — tudo sobe para o handler global em `src/plugins/error-handler.ts`.

### `services/` — ausente por decisão
Não existe pasta `services/` neste projeto. A avaliação do Dia 2 foi que não há regra de negócio além das restrições que o próprio banco já garante (unicidade de `carNumber`, chave estrangeira de `teamId`). Um service que apenas repassasse `return repository.findAll()` seria ruído.

Se surgir uma regra real — por exemplo, impedir que uma equipe tenha mais de dois pilotos titulares —, a camada nasce nesse momento e apenas para o recurso que precisa dela.

### `repositories/`
Única camada que importa o Prisma. Isolar o acesso a dados aqui significa que trocar de ORM afetaria só esta pasta.

### `schemas/`
Os schemas Zod ficam separados porque são consumidos por routes (validação), controllers (tipos via `z.infer`) e Swagger (documentação). São a fonte única de verdade sobre o formato dos dados.

### `plugins/`
Configuração transversal: segurança, erros e documentação.

> **Atenção — não use `app.register()` para estes.** Eles são chamados diretamente em `buildApp`. O `app.register` cria um contexto encapsulado, e o hook `onRoute` do Swagger (assim como os hooks do rate-limit) não enxergaria as rotas de `drivers` e `teams`, registradas como irmãs na raiz. O sintoma é o `/docs/json` devolver `paths` vazio.

### `config/`
Leitura e **validação das variáveis de ambiente** com um schema Zod, fazendo a aplicação falhar na inicialização — com mensagem clara — se algo estiver ausente ou malformado. O restante do código importa daqui em vez de ler `process.env` espalhado.

Isso resolve duas fragilidades concretas encontradas no Dia 6: o `import 'dotenv/config'` morando dentro de `src/lib/prisma.ts`, e o build do Docker falhando de forma obscura por falta de variáveis que o `prisma.config.ts` exige.

### `lib/`
Infraestrutura compartilhada que não é regra de negócio. Contém a instância única do `PrismaClient` — única de propósito, para não abrir múltiplos pools de conexão.

---

## Separação entre `app.ts` e `server.ts`

Não é preciosismo, é o que torna os testes viáveis:

- **`app.ts`** monta e devolve a instância do Fastify com tudo registrado, **sem chamar `listen()`**.
- **`server.ts`** lê a configuração e chama `listen()`.

Assim os testes importam o `app.ts` e usam `app.inject()` para disparar requisições **sem abrir porta de rede**. Testes ficam mais rápidos, não dão conflito de porta no CI e dispensam o `supertest`.

---

## Ambientes de banco

Três bancos distintos, todos com o mesmo schema vindo das migrations versionadas:

| Ambiente | Banco | Onde | Quem usa |
|---|---|---|---|
| Desenvolvimento | `api-formula-one` | Docker local, porta 5434 | `npm run dev` |
| Teste | `api-formula-one-test` | mesmo container Docker | `npm test` |
| Produção | `neondb` | Neon | Render |

O banco de teste é criado e migrado uma única vez no `globalSetup`, e as tabelas são truncadas a cada `beforeEach`. Por isso `docker compose up -d` é pré-requisito para rodar `npm test`.

---

## Convenção de nomes

| Tipo | Padrão | Exemplo |
| --- | --- | --- |
| Arquivos de código | `kebab-case.tipo.ts` | `driver.repository.ts` |
| Testes | `nome.test.ts` | `driver.test.ts` |
| Pastas | `kebab-case`, plural | `repositories/` |
| Tabelas no banco | `snake_case`, plural (via `@@map`) | `drivers` |
| Rotas | `kebab-case`, plural | `/drivers` |

Os models do Prisma usam `PascalCase` no singular (`Driver`) e são mapeados para tabelas em `snake_case` plural (`drivers`) via `@@map`. Isso mantém o código idiomático em TypeScript e o banco idiomático em SQL.

---

## O que é versionado e o que não é

| Caminho | Versionado? | Por quê |
| --- | --- | --- |
| `prisma/migrations/` | **Sim** | O deploy depende delas para aplicar o schema |
| `prisma.config.ts` | **Sim** | Necessário em build **e** em runtime no Prisma 7 |
| `src/generated/` | **Não** | Gerado por `prisma generate`; recriado a cada build |
| `.env` | **Não** | Contém credenciais reais do Neon |
| `.env.example` | **Sim** | Documenta quais variáveis existem, sem segredos |
| `package-lock.json` | **Sim** | Sem ele o `npm ci` não funciona |
| `dist/` | **Não** | Saída de build |

### Três armadilhas do pipeline de build

Descobertas na prática durante o Dia 6, e todas consequência de `src/generated/` não ser versionado:

1. **`prisma generate` precisa rodar antes do `tsc`** em todo ambiente de build (CI, Docker, Render). Sem isso, a compilação falha com módulo não encontrado.
2. **O `tsc` não copia os `.js` gerados.** Ele compila apenas `.ts`, então `dist/generated` nunca era criado e o servidor quebrava com `MODULE_NOT_FOUND` em produção. Resolvido com um script `postbuild` que copia `src/generated` → `dist/generated`.
3. **O `prisma.config.ts` precisa existir também em runtime.** Como o schema não tem `url` embutida, o `migrate deploy` no container não consegue resolver as variáveis de conexão sem esse arquivo — ele deve ser copiado para o estágio final da imagem, não só para o de build.