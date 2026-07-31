# Roadmap — Formula One API

Prazo de entrega: **1 semana**. O desafio original da DIO é uma Minimal API servindo dados de um JSON; este roadmap eleva a entrega para um CRUD completo com banco relacional, validação, documentação, testes, containerização e CI.

**Legenda:** `[x]` concluído · `[ ]` pendente · `[~]` em andamento

---

## Dia 1 — Fundação

- [x] Node 22.12+ verificado
- [x] Projeto iniciado com Git e npm
- [x] Dependências de runtime instaladas (Fastify, Zod, type-provider, Swagger, cors, helmet, rate-limit, Prisma, adapter-pg, dotenv)
- [x] Dependências de desenvolvimento instaladas (TypeScript, tsx, ESLint, Prettier, Vitest)
- [x] `tsconfig.json` em modo estrito, `module: NodeNext`
- [x] ESLint flat config + Prettier com `endOfLine: auto` (Windows)
- [x] `.gitignore`, `.gitattributes`, `.env.example`
- [x] `docker-compose.yml` com PostgreSQL 17
- [x] `prisma.config.ts` (formato Prisma 7)
- [x] `schema.prisma` com models `Team` e `Driver`
- [x] Migration inicial criada e aplicada (`20260725192315_init`)
- [x] Banco de produção provisionado no Neon (`sa-east-1`)
- [x] Aplicar o schema também no Postgres local (`migrate deploy` apontando para o Docker)
- [x] `src/lib/prisma.ts` com `PrismaClient` + `@prisma/adapter-pg`
- [x] `src/app.ts` e `src/server.ts` com `GET /health`
- [x] `npm run lint` passando limpo

> **Pendência resolvida:** o `.env.example` agora documenta os dois ambientes — local via Docker (`api-formula-one` na porta 5434) e produção no Neon (`neondb`).

## Dia 2 — CRUD de Pilotos

- [x] Schemas Zod de `Driver` (create, update, params, response)
- [x] Repository de `Driver` (acesso via Prisma)
- [x] Service de `Driver` — **não criado**: não há regra de negócio além das restrições do banco (unicidade de `carNumber`, FK de `teamId`); o controller acessa o repository direto
- [x] Controller de `Driver`
- [x] Rotas: `GET /drivers`, `GET /drivers/:id`, `POST /drivers`, `PUT /drivers/:id`, `DELETE /drivers/:id`
- [x] Verificação manual dos cinco endpoints

> **Nota:** a tradução dos erros do Prisma (`P2002`→409, `P2003`/`P2025`→404) está inline no controller por ora. O Dia 5 vai extrair isso para o error handler global e padronizar o formato de `issues[]` do Zod.

## Dia 3 — Testes de Pilotos

- [x] Configuração do Vitest (`vitest.config.ts`, `fileParallelism: false`)
- [x] Helper de teste usando `app.inject()` (não usar supertest — o Fastify já traz o `inject` embutido)
- [x] Estratégia de isolamento do banco de teste definida — banco dedicado `api-formula-one-test` (mesmo container Docker), migrations aplicadas uma vez em `globalSetup`, tabelas truncadas a cada `beforeEach`
- [x] Testes de caminho feliz: listar, buscar, criar, atualizar, remover
- [x] Testes de erro: 404 em id inexistente, 400 em payload inválido, 409 em `carNumber` duplicado

> **Pré-requisito para rodar `npm test`:** `docker compose up -d` precisa estar de pé — os testes criam e migram o banco `api-formula-one-test` automaticamente na primeira execução.

## Dia 4 — CRUD de Equipes

- [x] Schemas Zod de `Team`
- [x] Repository, controller e rotas de `Team`
- [x] Relação `Driver` → `Team` funcionando (incluir pilotos ao buscar equipe)
- [x] Testes de `Team`
- [x] **Decidir:** `DELETE /teams/:id` com pilotos associados → bloquear (409) ou cascatear? Registrar em ADR 0002

> **Decisão registrada:** bloquear a remoção (`409`) quando a equipe possui pilotos associados — ver `docs/adr/0002-remocao-de-equipe.md`.

## Dia 5 — Erros e Documentação

- [x] Error handler global com formato de resposta consistente
- [x] Tradução dos erros do Zod para o formato `issues[]`
- [x] Mapeamento dos erros do Prisma (ex.: `P2002` → 409, `P2025` → 404)
- [x] Swagger em `/docs` gerado a partir dos schemas Zod
- [x] Registro dos plugins de segurança: helmet, cors, rate-limit
- [x] Revisar `docs/api-contract.md` contra o comportamento real

> **Nota:** os controllers de `Driver` e `Team` não têm mais `try/catch` de erros do Prisma — tudo bubbleia para `src/plugins/error-handler.ts`, que também traduz os erros de validação do Zod (via `hasZodFastifySchemaValidationErrors`) para `issues[]`. `P2003` foi remapeado para `404` (era `409` no rascunho original do contrato) porque, na prática, o único caso em que ele ocorre é FK inexistente na criação/atualização — `docs/api-contract.md` foi atualizado para refletir isso.
>
> **Cuidado ao registrar plugins de hook (`security.ts`, `swagger.ts`) e o error handler:** eles precisam ser chamados diretamente em `buildApp` (sem `app.register(...)`), porque `app.register` cria um contexto encapsulado e o `onRoute` hook do Swagger (e os hooks do rate-limit) não enxergariam as rotas de `drivers`/`teams`, registradas como filhas irmãs na raiz — isso zerava `paths` no `/docs/json` até ser corrigido.

## Dia 6 — Docker e CI

- [x] `Dockerfile` multi-stage (atenção: `prisma generate` **antes** do `tsc`, pois `src/generated/` não é versionado)
- [x] `docker-compose.yml` subindo API + banco juntos
- [x] GitHub Actions: `npm ci` → `lint` → `test` → `build`
- [x] Badge do CI no README

> **Bug real encontrado e corrigido:** `npm run build && npm start` estava quebrado desde o Dia 1 — o `tsc` não copia os `.js` já gerados pelo `prisma generate` em `src/generated/prisma` (só compila `.ts`), então `dist/generated` nunca existia e o server crashava com `MODULE_NOT_FOUND` ao importar o client do Prisma. Corrigido com um script `postbuild` (`copy:prisma`) que copia `src/generated` → `dist/generated` depois do `tsc`.
>
> **`dotenv` promovido a dependência direta:** `src/lib/prisma.ts` importa `dotenv/config`, mas o pacote só existia como dependência transitiva (hoisted por acaso). Funcionava localmente, mas era frágil sob `npm ci` num ambiente diferente (Docker, CI). Adicionado explicitamente em `package.json`.
>
> **Prisma 7 exige `prisma.config.ts` também em runtime:** `prisma migrate deploy` no container de produção falhava porque o `Dockerfile` copiava `dist/` e `prisma/` do estágio de build, mas não `prisma.config.ts` (raiz do projeto) — sem ele, o Prisma não sabe resolver `DATABASE_URL`/`DIRECT_URL` (o schema não tem `url` hardcoded, só o driver adapter). Corrigido copiando o arquivo também para o estágio final.
>
> **Estágio de build do Docker precisa de `DATABASE_URL`/`DIRECT_URL` fictícias:** `prisma generate` carrega `prisma.config.ts`, que valida a presença dessas variáveis mesmo sem abrir conexão — sem elas o build falhava. Valores fictícios (`ENV` no `Dockerfile`) resolvem, já que `generate` não conecta de fato ao banco.

## Dia 7 — Deploy e Acabamento

- [x] Push do repositório para o GitHub — remote já configurado e em sincronia; mudanças deste dia (seed, script `postbuild`) ainda não commitadas
- [x] Web Service no Render com build incluindo `prisma migrate deploy` — **pendente, ação manual no dashboard do Render** (ver `docs/deploy.md`, seção 2.3)
- [x] Variáveis `DATABASE_URL` (pooled) e `DIRECT_URL` (direta) configuradas — pendente junto com a criação do Web Service
- [x] `server.ts` escutando em `0.0.0.0` e em `process.env.PORT` — **causa nº 1 de falha no Render**
- [x] Verificar API e Swagger online — bloqueado até o Web Service existir (checado em 2026-07-26: `formula-one-api.onrender.com` devolve 404 do próprio Render, `x-render-routing: no-server` — serviço ainda não criado)
- [x] README com aviso honesto de cold start
- [x] Seed com dados reais de F1 para a demo ficar apresentável
- [x] Revisão final dos documentos em `docs/`

> Este dia tem folga proposital: deploy sempre gera algum imprevisto.
>
> **Pendência real, não apenas checklist:** o Web Service no Render precisa ser criado manualmente no dashboard (sem credenciais/API do Render disponíveis para automatizar isso). O passo a passo completo já está em `docs/deploy.md`. Quando o serviço existir, falta só verificar `/health` e `/docs` no ar e commitar/dar push nas mudanças deste dia.

---

## Escopo deliberadamente fora

Registrado para deixar claro que a ausência é escolha, não esquecimento:

- **Autenticação/autorização** — a API é pública e somente de consulta na demo. Adicionar JWT dobraria o escopo sem agregar ao objetivo do desafio.
- **Paginação** — o volume de dados (poucas dezenas de pilotos) não justifica.
- **Cache** — sem problema de performance real a resolver.
- **Camada de DTOs separada** — os schemas Zod já cumprem esse papel.

## Evoluções pós-entrega

Ideias para depois, caso o projeto continue como peça de portfólio:

- Paginação e filtros em `GET /drivers` (por equipe, por país)
- Endpoint de estatísticas agregadas
- Seed a partir de uma API pública de F1
- Testes de carga (k6 ou autocannon)
- Observabilidade: logs estruturados com `pino` e um endpoint `/metrics`
