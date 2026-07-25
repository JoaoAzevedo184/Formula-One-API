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
- [ ] Aplicar o schema também no Postgres local (`migrate deploy` apontando para o Docker)
- [ ] `src/lib/prisma.ts` com `PrismaClient` + `@prisma/adapter-pg`
- [ ] `src/app.ts` e `src/server.ts` com `GET /health`
- [ ] `npm run lint` passando limpo

> **Pendência de configuração:** o `.env.example` e a documentação citam o banco `formula_one`, mas o Neon provisionou `neondb`. Alinhar um dos dois.

## Dia 2 — CRUD de Pilotos

- [ ] Schemas Zod de `Driver` (create, update, params, response)
- [ ] Repository de `Driver` (acesso via Prisma)
- [ ] Service de `Driver` — **apenas se houver regra de negócio**; caso contrário o controller acessa o repository direto
- [ ] Controller de `Driver`
- [ ] Rotas: `GET /drivers`, `GET /drivers/:id`, `POST /drivers`, `PUT /drivers/:id`, `DELETE /drivers/:id`
- [ ] Verificação manual dos cinco endpoints

## Dia 3 — Testes de Pilotos

- [ ] Configuração do Vitest
- [ ] Helper de teste usando `app.inject()` (não usar supertest — o Fastify já traz o `inject` embutido)
- [ ] Estratégia de isolamento do banco de teste definida
- [ ] Testes de caminho feliz: listar, buscar, criar, atualizar, remover
- [ ] Testes de erro: 404 em id inexistente, 400 em payload inválido, 409 em `carNumber` duplicado

## Dia 4 — CRUD de Equipes

- [ ] Schemas Zod de `Team`
- [ ] Repository, controller e rotas de `Team`
- [ ] Relação `Driver` → `Team` funcionando (incluir pilotos ao buscar equipe)
- [ ] Testes de `Team`
- [ ] **Decidir:** `DELETE /teams/:id` com pilotos associados → bloquear (409) ou cascatear? Registrar em ADR 0002

## Dia 5 — Erros e Documentação

- [ ] Error handler global com formato de resposta consistente
- [ ] Tradução dos erros do Zod para o formato `issues[]`
- [ ] Mapeamento dos erros do Prisma (ex.: `P2002` → 409, `P2025` → 404)
- [ ] Swagger em `/docs` gerado a partir dos schemas Zod
- [ ] Registro dos plugins de segurança: helmet, cors, rate-limit
- [ ] Revisar `docs/api-contract.md` contra o comportamento real

## Dia 6 — Docker e CI

- [ ] `Dockerfile` multi-stage (atenção: `prisma generate` **antes** do `tsc`, pois `src/generated/` não é versionado)
- [ ] `docker-compose.yml` subindo API + banco juntos
- [ ] GitHub Actions: `npm ci` → `lint` → `test` → `build`
- [ ] Badge do CI no README

## Dia 7 — Deploy e Acabamento

- [ ] Push do repositório para o GitHub
- [ ] Web Service no Render com build incluindo `prisma migrate deploy`
- [ ] Variáveis `DATABASE_URL` (pooled) e `DIRECT_URL` (direta) configuradas
- [ ] `server.ts` escutando em `0.0.0.0` e em `process.env.PORT` — **causa nº 1 de falha no Render**
- [ ] Verificar API e Swagger online
- [ ] README com aviso honesto de cold start
- [ ] Seed com dados reais de F1 para a demo ficar apresentável
- [ ] Revisão final dos documentos em `docs/`

> Este dia tem folga proposital: deploy sempre gera algum imprevisto.

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