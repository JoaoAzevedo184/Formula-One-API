# 🏎️ Formula One API

API REST para gerenciamento de **pilotos** e **equipes da Fórmula 1**, desenvolvida com **Node.js, Fastify, TypeScript e Prisma ORM**.

O projeto nasceu como um desafio da **Digital Innovation One (DIO)** e foi evoluído para servir como peça de portfólio, aplicando boas práticas de desenvolvimento back-end, arquitetura em camadas, documentação automática, testes e deploy em produção.

[![CI](https://github.com/JoaoAzevedo184/formula-one-api/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/JoaoAzevedo184/formula-one-api/actions)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![Fastify](https://img.shields.io/badge/Fastify-5-black?logo=fastify)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)

---

## 🌐 Demonstração

| Serviço      | URL                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------ |
| API          | [https://formula-one-api.onrender.com](https://formula-one-api.onrender.com)               |
| Swagger      | [https://formula-one-api.onrender.com/docs](https://formula-one-api.onrender.com/docs)     |
| Health Check | [https://formula-one-api.onrender.com/health](https://formula-one-api.onrender.com/health) |

> ⚠️ O projeto utiliza o plano gratuito do **Render** e do **Neon**. Após alguns minutos sem uso, ambos entram em modo de hibernação (*cold start*). A primeira requisição pode levar até cerca de **1 minuto**. Basta aguardar e tentar novamente.

---

# ✨ Funcionalidades

### Pilotos (`/drivers`)

* Listar pilotos
* Buscar piloto por ID
* Cadastrar piloto
* Atualizar piloto
* Remover piloto

### Equipes (`/teams`)

* Listar equipes
* Buscar equipe por ID
* Cadastrar equipe
* Atualizar equipe
* Remover equipe

Relacionamento:

```
Team
 │
 ├── Driver
 ├── Driver
 ├── Driver
 └── Driver
```

Cada piloto pertence a uma equipe (`Driver.teamId → Team.id`).

---

# 🛠 Tecnologias

| Camada          | Tecnologia        |
| --------------- | ----------------- |
| Runtime         | Node.js 22        |
| Linguagem       | TypeScript        |
| Framework       | Fastify           |
| ORM             | Prisma ORM        |
| Banco de dados  | PostgreSQL (Neon) |
| Validação       | Zod               |
| Documentação    | Swagger/OpenAPI   |
| Testes          | Vitest            |
| Containerização | Docker            |
| CI/CD           | GitHub Actions    |
| Deploy          | Render            |

---

# 🏗 Arquitetura

O projeto segue uma arquitetura em camadas, porém sem criar abstrações desnecessárias.

```
Cliente
    │
    ▼
Routes
    │
    ▼
Controllers
    │
    ▼
Services
    │
    ▼
Repositories
    │
    ▼
Prisma ORM
    │
    ▼
PostgreSQL
```

Estrutura:

```
src
├── app.ts
├── server.ts
│
├── controllers/
├── repositories/
├── routes/
├── schemas/
├── services/
├── plugins/
├── lib/
│
prisma/
tests/
docs/
```

As principais decisões arquiteturais encontram-se documentadas em:

```
docs/adr/
```

---

# 🚀 Executando o projeto

## Pré-requisitos

* Node.js 22+
* Docker
* Docker Compose

## Instalação

```bash
git clone https://github.com/JoaoAzevedo184/Formula-One-API.git

cd Formula-One-API

npm install

cp .env.example .env

docker compose up -d

npx prisma migrate dev

npm run seed

npm run dev
```

Aplicação:

```
http://localhost:3333
```

Swagger:

```
http://localhost:3333/docs
```

---

# 🐳 Docker

Também é possível executar tudo utilizando Docker.

```bash
docker compose up --build
```

O container aplica automaticamente:

* Prisma Generate
* Prisma Migrate Deploy

antes de iniciar a aplicação.

---

# 📜 Scripts

| Script             | Descrição                     |
| ------------------ | ----------------------------- |
| npm run dev        | Ambiente de desenvolvimento   |
| npm run build      | Compila TypeScript            |
| npm start          | Executa a aplicação compilada |
| npm test           | Executa os testes             |
| npm run test:watch | Testes em modo watch          |
| npm run lint       | ESLint                        |
| npm run format     | Prettier                      |
| npm run seed       | Popula o banco                |

---

# 🧪 Testes

Para executar:

```bash
npm test
```

São testados os principais fluxos de CRUD:

* criação
* listagem
* atualização
* remoção
* payload inválido
* recurso inexistente (404)

---

# 🚀 Deploy

## Produção

| Serviço | Plataforma     |
| ------- | -------------- |
| API     | Render         |
| Banco   | Neon           |
| CI      | GitHub Actions |

Variáveis necessárias:

```env
DATABASE_URL=
DIRECT_URL=
NODE_ENV=production
```

O container executa automaticamente:

```bash
npx prisma migrate deploy
```

antes de iniciar a aplicação.

---

# 📈 Qualidade do projeto

✔ TypeScript

✔ Fastify

✔ Prisma ORM

✔ PostgreSQL

✔ Docker

✔ GitHub Actions

✔ Swagger

✔ Validação com Zod

✔ Testes automatizados

✔ Migrations

✔ Seed

✔ Deploy em produção

✔ Arquitetura em camadas

---

# 📌 Roadmap

* [x] CRUD de pilotos
* [x] CRUD de equipes
* [x] Relacionamento entre entidades
* [x] Swagger
* [x] Docker
* [x] CI/CD
* [x] Deploy em produção
* [ ] Autenticação JWT
* [ ] Paginação
* [ ] Filtros
* [ ] Cache com Redis
* [ ] Observabilidade (OpenTelemetry)

---

# 📄 Licença

Distribuído sob a licença **MIT**.
