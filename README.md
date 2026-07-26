# 🏎️ Formula One API

API REST para gerenciamento de pilotos e equipes da Fórmula 1, construída com Node.js, Fastify e TypeScript. Projeto desenvolvido como desafio da DIO, evoluído para servir como peça de portfólio demonstrando boas práticas de back-end.

[![CI](https://github.com/JoaoAzevedo184/formula-one-api/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/JoaoAzevedo184/formula-one-api/actions)

> **Demo online:** [formula-one-api.onrender.com](https://formula-one-api.onrender.com) · **Docs (Swagger):** [/docs](https://formula-one-api.onrender.com/docs)
>
> ⚠️ O serviço está hospedado no plano gratuito do Render + Neon. Após período de inatividade, a primeira requisição pode levar até ~1 minuto (cold start do servidor e do banco). Basta aguardar e recarregar.

---

## Tecnologias

| Camada | Escolha | Motivo |
|---|---|---|
| Runtime | Node.js 22 LTS | Estável, amplamente suportado |
| Linguagem | TypeScript | Tipagem estática, segurança em refactors |
| Framework | Fastify | Alta performance, schema-first, ecossistema de plugins |
| Validação | Zod + `fastify-type-provider-zod` | Um schema serve para validação, tipos e Swagger |
| ORM | Prisma | DX excelente, migrations versionadas, type-safe |
| Banco | PostgreSQL | Relacional, padrão de mercado |
| Docs | Swagger (`@fastify/swagger` + UI) | Gerado a partir dos schemas Zod |
| Testes | Vitest | Rápido, API compatível com Jest, nativo em TS/ESM |
| Container | Docker + Docker Compose | Ambiente reproduzível |
| CI | GitHub Actions | Lint + testes a cada push |

## Arquitetura

A aplicação segue uma separação em camadas, mas **sem criar camadas vazias**: um service só existe quando há regra de negócio real; caso contrário o controller conversa direto com o repository.

```
Request → Route (schema Zod) → Controller → Service → Repository → Prisma → PostgreSQL
```

```
src
├── routes/         # Registro de rotas + binding dos schemas Zod
├── controllers/    # Recebe req/reply, orquestra, responde
├── services/       # Regra de negócio (apenas onde existe regra)
├── repositories/   # Acesso a dados via Prisma
├── schemas/        # Schemas Zod (fonte única de verdade)
├── plugins/        # error-handler, swagger, prisma (encapsulados)
├── lib/            # Utilitários
└── app.ts          # Composição da aplicação (build da instância Fastify)
prisma/
└── schema.prisma
tests/
```

Decisões de arquitetura documentadas em [`docs/adr/`](./docs/adr).

## Funcionalidades

**Pilotos (`/drivers`)**
- ✔ Listar pilotos
- ✔ Buscar piloto por id
- ✔ Cadastrar piloto
- ✔ Atualizar piloto
- ✔ Remover piloto

**Equipes (`/teams`)**
- ✔ Listar equipes
- ✔ Buscar equipe por id
- ✔ Cadastrar equipe
- ✔ Atualizar equipe
- ✔ Remover equipe

Relação: um piloto pertence a uma equipe (`Driver.teamId → Team.id`).

Documentação interativa completa disponível em `/docs` (Swagger UI).

## Como executar

### Pré-requisitos
- Node.js 22+
- Docker e Docker Compose (para o Postgres local)

### Passo a passo

```bash
# 1. Clonar
git clone https://github.com/JoaoAzevedo184/formula-one-api.git
cd formula-one-api

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env

# 4. Subir o banco (PostgreSQL via Docker)
docker compose up -d

# 5. Aplicar migrations
npx prisma migrate dev

# 6. (Opcional) Popular com dados de exemplo
npm run seed

# 7. Rodar em modo desenvolvimento
npm run dev
```

A API sobe em `http://localhost:3333` e o Swagger em `http://localhost:3333/docs`.

### Alternativa: tudo via Docker Compose

`docker compose up -d --build` sobe a API **e** o banco juntos, sem precisar de Node instalado na máquina. O container da API aplica as migrations (`prisma migrate deploy`) automaticamente antes de iniciar o servidor.

### Scripts disponíveis

| Script | Ação |
|---|---|
| `npm run dev` | Servidor com hot reload |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Executa a versão compilada |
| `npm test` | Roda os testes (Vitest) |
| `npm run test:watch` | Testes em watch mode |
| `npm run lint` | ESLint |
| `npm run seed` | Popula o banco com dados de exemplo |

## Testes

```bash
npm test
```

Cobertura de testes de integração para os fluxos de CRUD de pilotos e equipes (listar, criar, atualizar, remover), incluindo casos de erro (404, 400 com payload inválido).

## Deploy

| Componente | Serviço | Plano |
|---|---|---|
| Web service | Render | Free (hiberna após 15 min) |
| Banco | Neon | Free permanente (scale-to-zero) |

Variáveis necessárias em produção: `DATABASE_URL` (connection string do Neon), `PORT` (fornecida pelo Render).

## Licença

MIT