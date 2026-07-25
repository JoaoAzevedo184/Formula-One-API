# ADR 0001 — Escolha de stack e arquitetura

- **Status:** Aceito
- **Data:** 2026-07-16
- **Contexto:** Desafio DIO (Minimal API em Node.js) evoluído para peça de portfólio back-end.

## Contexto

O desafio original propõe uma Minimal API com Node.js + Fastify servindo dados de um JSON. Como o objetivo é fortalecer o portfólio para vagas de back-end, a entrega foi elevada para um CRUD completo com banco relacional, validação, documentação, testes, containerização e CI — sem fugir do escopo enxuto adequado a um desafio.

O desenvolvedor já possui projetos robustos em Spring Boot e FastAPI; este projeto demonstra **versatilidade em Node/TypeScript** aplicando as mesmas boas práticas.

## Decisões

### 1. TypeScript desde o início
Nada de começar em JavaScript para "migrar depois" — isso seria retrabalho sem ganho. O projeto nasce com `tsconfig` estrito, ESLint e Prettier configurados para TS.

### 2. Fastify como framework
Já indicado pelo desafio. Escolha idiomática: alto desempenho, arquitetura schema-first e ecossistema de plugins (swagger, cors, etc.).

### 3. Zod para validação (via `fastify-type-provider-zod`)
O Fastify usa JSON Schema nativamente; TypeBox seria a integração de menor atrito. Optou-se por **Zod** porque:
- É o padrão que mais aparece em vagas de mercado (maior valor de portfólio).
- Com o type-provider, um único schema Zod serve a **três propósitos**: validação em runtime, inferência de tipos TS (`z.infer`) e geração automática da documentação Swagger.

Trade-off aceito: setup inicial um pouco maior que TypeBox.

### 4. Prisma + PostgreSQL
- **Prisma:** migrations versionadas, cliente type-safe, DX madura.
- **PostgreSQL direto no dev** (via Docker), não SQLite. Embora SQLite seja mais rápido para começar, o Prisma trata alguns tipos de forma diferente entre os dois bancos; como o deploy será em Postgres, usar Postgres desde o desenvolvimento elimina surpresas na migração. O desenvolvedor já tem Docker no homelab, então o custo de subir um Postgres local é baixo.

### 5. Camadas sob demanda (evitar over-engineering)
Controllers → Services → Repositories é a estrutura base, mas **um service só é criado quando há regra de negócio real**. Um service que apenas repassa `return repository.findAll()` é ruído — nesses casos o controller acessa o repository diretamente. Recrutadores experientes reconhecem camadas vazias como cargo cult.

### 6. Testes junto com a construção, não no fim
Cada CRUD é testado assim que implementado (Vitest), não relegado a uma etapa final que, na prática, raramente acontece bem.

### 7. Deploy: Render (web) + Neon (Postgres)
Pesquisa de julho/2026 sobre free tiers:
- **Fly.io:** exige cartão, sem free tier real. Descartado.
- **Railway:** só trial de $5; plano free de $1/mês é inutilizável. Descartado.
- **Render web service:** free viável (hiberna após 15 min, cold start ~1 min).
- **Render Postgres:** free **expira em 30 dias** → armadilha para portfólio de longa duração.
- **Neon Postgres:** free **permanente**, sem cartão, scale-to-zero. Resolve o furo do Render.

Combinação escolhida: **Render (web) + Neon (banco)**. Ambos gratuitos, permanentes e sem cartão. Custo aceito: cold start duplo após inatividade.

## Consequências

- A aplicação fica pronta para produção com custo zero e sem expiração.
- O README precisa avisar honestamente sobre o cold start.
- A escolha de Postgres desde o dev exige Docker na máquina de desenvolvimento.
- O uso do type-provider do Zod acopla validação e documentação, reduzindo duplicação.
