# Guia de Deploy — Formula One API

Arquitetura de produção: **Neon** (PostgreSQL) + **Render** (API Node.js).

Ambos gratuitos, permanentes e sem exigir cartão de crédito.

---

## Modelo mental

| | Desenvolvimento | Produção |
|---|---|---|
| Banco | PostgreSQL no Docker (local) | Neon |
| API | `npm run dev` (localhost:3333) | Render |
| Migrations | `prisma migrate dev` (cria) | `prisma migrate deploy` (aplica) |
| Configuração | `.env` local | Variáveis de ambiente do Render |

São **dois bancos separados e independentes**. Eles ficam com o mesmo schema porque as migrations são arquivos versionados no Git — o mesmo histórico é aplicado nos dois.

O código-fonte é idêntico nos dois ambientes. A única coisa que muda são as variáveis `DATABASE_URL` e `DIRECT_URL`.

---

## Parte 1 — Banco de dados (Neon)

### 1.1 Criar o projeto

1. Acesse [neon.com](https://neon.com) e crie a conta (não pede cartão).
2. Crie um projeto — escolha a região mais próxima (`AWS us-east-1` costuma ser a mais próxima do Brasil na camada gratuita; se houver `sa-east-1`, melhor ainda).
3. Nomeie o banco como `formula_one`.

### 1.2 Copiar as duas connection strings

No painel do Neon, clique em **Connect**. Você precisa de **duas** strings:

- **Pooled** — tem `-pooler` no hostname. É a que a aplicação usa em runtime.
- **Direct** — sem `-pooler`. É a que o CLI do Prisma usa para migrations.

```ini
DATABASE_URL="postgresql://user:senha@ep-xxxx-pooler.regiao.aws.neon.tech/formula_one?sslmode=require"
DIRECT_URL="postgresql://user:senha@ep-xxxx.regiao.aws.neon.tech/formula_one?sslmode=require"
```

**Por que duas?** Operações de schema (DDL) falham através do PgBouncer, o pooler. Por isso as migrations precisam da conexão direta, enquanto a aplicação em runtime aproveita o pooler.

### 1.3 Aplicar as migrations no Neon

Do seu Windows, temporariamente apontando para produção:

```powershell
# guarda o .env local
Copy-Item .env .env.local.bak

# edita o .env colocando as URLs do Neon, então:
npx prisma migrate deploy

# restaura o ambiente local
Copy-Item .env.local.bak .env -Force
Remove-Item .env.local.bak
```

> Use `migrate deploy`, **nunca** `migrate dev` contra produção. O `migrate dev` pode tentar resetar o banco se detectar divergência.

Confirme no painel do Neon que as tabelas `teams` e `drivers` apareceram.

**Alternativa mais limpa:** deixe as migrations rodarem automaticamente no build do Render (ver 2.3). Assim você nunca precisa apontar sua máquina para produção.

---

## Parte 2 — API (Render)

### 2.1 Pré-requisito no código

Esta é a causa nº 1 de deploy que falha no Render. Seu `src/server.ts` **precisa** escutar assim:

```typescript
const port = Number(process.env.PORT) || 3333;

await app.listen({ port, host: '0.0.0.0' });
```

Dois pontos obrigatórios:

- **`host: '0.0.0.0'`** — o padrão do Fastify é `localhost`, que só aceita conexões de dentro do próprio container. O Render não consegue alcançar a aplicação e o deploy fica em "Service unhealthy" para sempre.
- **`process.env.PORT`** — o Render injeta a porta automaticamente. Se você fixar 3333, não funciona.

### 2.2 Subir o repositório

```powershell
git remote add origin https://github.com/JoaoAzevedo184/formula-one-api.git
git branch -M main
git push -u origin main
```

Confirme que o `.env` **não** foi enviado (ele está no `.gitignore`).

### 2.3 Criar o Web Service

1. Em [render.com](https://render.com), crie a conta (não pede cartão) e conecte o GitHub.
2. **New → Web Service** → selecione o repositório.
3. Configure:

| Campo | Valor |
|---|---|
| Runtime | Node |
| Region | Oregon (ou a mais próxima do Neon) |
| Branch | `main` |
| Build Command | `npm ci && npx prisma generate && npx prisma migrate deploy && npm run build` |
| Start Command | `npm start` |
| Instance Type | Free |

Colocar `migrate deploy` no build faz com que toda alteração de schema seja aplicada automaticamente a cada deploy. É a prática recomendada e elimina o passo manual da seção 1.3.

### 2.4 Variáveis de ambiente

Em **Environment**, adicione:

| Chave | Valor |
|---|---|
| `DATABASE_URL` | connection string **pooled** do Neon |
| `DIRECT_URL` | connection string **direta** do Neon |
| `NODE_VERSION` | `22.12.0` |

Não defina `PORT` — o Render gerencia isso sozinho.

### 2.5 Deploy

O Render faz o build automaticamente. Acompanhe pelos logs. Ao final você recebe uma URL:

```
https://formula-one-api.onrender.com
https://formula-one-api.onrender.com/docs
```

A partir daí, todo `git push` para a `main` dispara um novo deploy.

---

## Comportamento esperado (e o que documentar no README)

Ambos os serviços gratuitos hibernam:

- **Render:** o serviço web dorme após 15 minutos sem tráfego; o próximo acesso leva de 30s a 1min para responder.
- **Neon:** o compute escala para zero após 5 minutos de inatividade; acordar leva de 500ms a alguns segundos.

Na prática, um recrutador que abrir seu link após dias de inatividade vai esperar cerca de um minuto na primeira requisição. **Avise isso no README** — parece muito pior um link que aparenta estar quebrado do que um aviso honesto sobre cold start.

### Timeout na primeira conexão

Se aparecer `P1001: Can't reach database server`, é o cold start do Neon estourando o timeout do Prisma. A solução documentada pelo Neon é adicionar o parâmetro à connection string:

```
DATABASE_URL="postgresql://...?sslmode=require&connect_timeout=15"
```

---

## Checklist de deploy

- [ ] `host: '0.0.0.0'` e `process.env.PORT` no `server.ts`
- [ ] `.env` fora do Git, `.env.example` versionado
- [ ] Migrations commitadas em `prisma/migrations/`
- [ ] Projeto criado no Neon, duas connection strings copiadas
- [ ] Web Service no Render com build command incluindo `migrate deploy`
- [ ] `DATABASE_URL` (pooled) e `DIRECT_URL` (direta) nas env vars do Render
- [ ] `connect_timeout=15` na `DATABASE_URL` se houver timeout
- [ ] README com aviso de cold start e links da API e do Swagger