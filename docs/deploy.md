# Guia de Deploy — Formula One API

Arquitetura de produção: **Neon** (PostgreSQL) + **Render** (API Node.js).

Ambos gratuitos, permanentes e sem exigir cartão de crédito.

---

## Modelo mental

| | Desenvolvimento | Teste | Produção |
|---|---|---|---|
| Banco | `api-formula-one` (Docker, porta 5434) | `api-formula-one-test` (mesmo container) | `neondb` (Neon) |
| API | `npm run dev` → localhost:3333 | `app.inject()`, sem porta | Render |
| Migrations | `prisma migrate dev` (cria) | `globalSetup` aplica | `prisma migrate deploy` (aplica) |
| Configuração | `.env` | `.env` | Env vars do Render |

São bancos **separados e independentes**. Ficam com o mesmo schema porque as migrations são arquivos versionados no Git.

O código-fonte é idêntico em todos. A única coisa que muda são as variáveis de ambiente.

---

## Ordem correta das etapas

Fazer fora de ordem custa horas depurando problemas já resolvidos.

```
1. Commitar TODAS as correções locais
2. Push para o GitHub
3. Decidir runtime (Docker ou Node nativo)
4. Escolher a região do Neon e do Render — juntas
5. Criar o Web Service no Render
6. Configurar variáveis de ambiente
7. Verificar /health e /docs
```

### Etapa 1 é bloqueante

Correções que existem só na máquina local **não** vão para o servidor. Se o `postbuild` (`copy:prisma`) não estiver commitado, o build no Render passa e o `npm start` morre com `MODULE_NOT_FOUND` — exatamente o bug já corrigido localmente.

```powershell
git status                    # nada relevante pode ficar de fora
git add -A
git commit -m "fix: copia do client Prisma no postbuild + seed"
git push
```

---

## Parte 0 — Segurança antes de tudo

### `.dockerignore` é obrigatório

Sem esse arquivo, o `.env` com as credenciais reais do Neon entra no contexto de build da imagem, e o `node_modules` inteiro é copiado junto.

```powershell
@'
node_modules
dist
.git
.env
.env.*
!.env.example
src/generated
tests
docs
*.md
.vscode
'@ | Set-Content -Path .dockerignore -Encoding utf8
```

### Verificar que nenhum segredo está versionado

```powershell
git check-ignore -v .env      # precisa retornar a regra do .gitignore
git log --all --oneline -- .env   # precisa retornar vazio
```

Se o segundo comando retornar qualquer commit, as credenciais estão no histórico do Git. Nesse caso, rotacione a senha no painel do Neon — remover o arquivo em um commit novo **não** apaga o histórico.

---

## Parte 1 — Decisão de região

**Esta decisão precisa ser tomada para os dois serviços em conjunto.**

O Render opera em cinco regiões: Oregon, Ohio, Virgínia, Frankfurt e Singapura. **Não há região na América do Sul.**

A consequência é direta: um banco Neon em `sa-east-1` (São Paulo) com a API no Render obriga **toda consulta ao banco** a atravessar o continente. Como uma requisição HTTP costuma disparar mais de uma consulta, a latência se multiplica.

| Arranjo | Latência API↔banco | Latência usuário BR→API |
|---|---|---|
| Render Oregon + Neon `sa-east-1` | Alta (transcontinental, a cada query) | Alta |
| Render Virgínia + Neon `us-east-1` | **Mínima (co-localizados)** | Moderada |

**Recomendação: Render em Virgínia + Neon em `us-east-1`.** A latência que importa mais é a de banco, porque incide em cada consulta; a do usuário incide uma vez por requisição.

> Se o projeto Neon já estiver em `sa-east-1`, recriá-lo em `us-east-1` é barato **enquanto o banco tem pouco dado** — basta aplicar as migrations e rodar o seed. O custo dessa migração só cresce com o tempo.

---

## Parte 2 — Banco de dados (Neon)

### 2.1 Criar o projeto

1. Acesse [neon.com](https://neon.com) e crie a conta (não pede cartão).
2. Crie o projeto na região decidida na Parte 1.
3. O Neon nomeia o banco como `neondb` por padrão. Manter esse nome é aceitável — apenas garanta que a documentação reflita a realidade.

### 2.2 Copiar as duas connection strings

No painel, clique em **Connect**. São necessárias **duas**:

- **Pooled** — tem `-pooler` no hostname. Usada pela aplicação em runtime.
- **Direct** — sem `-pooler`. Usada pelo CLI do Prisma nas migrations.

```ini
DATABASE_URL="postgresql://user:senha@ep-xxxx-pooler.regiao.aws.neon.tech/neondb?sslmode=require&connect_timeout=15"
DIRECT_URL="postgresql://user:senha@ep-xxxx.regiao.aws.neon.tech/neondb?sslmode=require"
```

**Por que duas?** Operações de schema (DDL) falham através do PgBouncer, o pooler. As migrations exigem conexão direta; a aplicação em runtime se beneficia do pooler.

O `connect_timeout=15` previne o erro `P1001: Can't reach database server`, causado pelo cold start do Neon estourando o timeout padrão do Prisma.

### 2.3 Aplicar as migrations

O caminho recomendado é deixar isso automático no deploy (Parte 3). Para aplicar manualmente:

```powershell
Copy-Item .env .env.local.bak
# editar o .env com as URLs do Neon
npx prisma migrate deploy
npx prisma db seed
Copy-Item .env.local.bak .env -Force
Remove-Item .env.local.bak
```

> Use `migrate deploy`, **nunca** `migrate dev` contra produção — o `migrate dev` pode tentar resetar o banco ao detectar divergência.

---

## Parte 3 — API (Render)

### 3.1 Pré-requisito no código

Causa nº 1 de deploy que falha no Render. O `src/server.ts` precisa escutar assim:

```typescript
await app.listen({ port: Number(process.env.PORT) || 3333, host: '0.0.0.0' });
```

- **`host: '0.0.0.0'`** — o padrão do Fastify é `localhost`, que só aceita conexões de dentro do próprio container. O Render nunca alcança a aplicação e o serviço fica permanentemente "unhealthy".
- **`process.env.PORT`** — injetada pelo Render. Porta fixa não funciona.

### 3.2 Escolher o runtime — Docker ou Node nativo

**O Render detecta o `Dockerfile` na raiz automaticamente.** Havendo um, o runtime Docker é usado e o *Build Command* do dashboard é ignorado. Escolha consciente:

| | Docker | Node nativo |
|---|---|---|
| Build | Mais lento no plano free | Mais rápido |
| Reprodutibilidade | Idêntico ao local | Depende do ambiente do Render |
| Migrations | Pre-Deploy Command | Podem ir no Build Command |
| Já depurado neste projeto | Sim | Não |

**Recomendação: Docker**, já que o `Dockerfile` deste projeto já resolveu as três armadilhas do Prisma 7 (ver `docs/estrutura.md`). Para usar Node nativo, remova ou renomeie o `Dockerfile`.

#### Configuração — runtime Docker

| Campo | Valor |
|---|---|
| Language / Runtime | Docker |
| Region | Virgínia (mesma do Neon) |
| Branch | `main` |
| Dockerfile Path | `./Dockerfile` |
| Pre-Deploy Command | `npx prisma migrate deploy` |
| Instance Type | Free |

#### Configuração — runtime Node nativo

| Campo | Valor |
|---|---|
| Runtime | Node |
| Region | Virgínia (mesma do Neon) |
| Branch | `main` |
| Build Command | `npm ci && npx prisma generate && npx prisma migrate deploy && npm run build` |
| Start Command | `npm start` |
| Instance Type | Free |

> O `npm run build` dispara o `postbuild` automaticamente (convenção do npm), o que copia `src/generated` para `dist/generated`. Sem essa etapa o servidor não sobe.

### 3.3 Variáveis de ambiente

| Chave | Valor |
|---|---|
| `DATABASE_URL` | connection string **pooled** do Neon, com `connect_timeout=15` |
| `DIRECT_URL` | connection string **direta** do Neon |
| `NODE_VERSION` | `22.12.0` (apenas no runtime Node) |

Não defina `PORT` — o Render gerencia.

### 3.4 Verificação

```powershell
curl.exe https://SEU-SERVICO.onrender.com/health
curl.exe https://SEU-SERVICO.onrender.com/drivers
```

Abra `/docs` no navegador e confirme que os endpoints aparecem — `paths` vazio indica o problema de encapsulamento de plugins descrito em `docs/estrutura.md`.

**Diagnóstico rápido:** se a resposta for um 404 do próprio Render com o header `x-render-routing: no-server`, o serviço ainda não existe ou nunca completou um deploy. Não é erro da aplicação.

---

## Comportamento esperado

Ambos os serviços gratuitos hibernam:

- **Render:** dorme após 15 minutos sem tráfego; o próximo acesso leva de 30s a 1min.
- **Neon:** o compute escala para zero após 5 minutos de inatividade; acordar leva de 500ms a alguns segundos.

Um recrutador que abrir o link após dias de inatividade espera cerca de um minuto na primeira requisição. **Documente isso no README** — um aviso honesto parece muito melhor que um link aparentemente quebrado.

---

## Checklist

**Antes de tocar no dashboard do Render**
- [ ] Todas as correções commitadas e enviadas (`postbuild`, seed, `.dockerignore`)
- [ ] `.dockerignore` criado, excluindo `.env` e `node_modules`
- [ ] `git log --all -- .env` retorna vazio
- [ ] `host: '0.0.0.0'` e `process.env.PORT` no `server.ts`
- [ ] Migrations commitadas em `prisma/migrations/`
- [ ] `prisma.config.ts` versionado

**Decisões**
- [ ] Região definida para Neon e Render em conjunto
- [ ] Runtime escolhido: Docker ou Node nativo

**No Render**
- [ ] Web Service criado na região correta
- [ ] `DATABASE_URL` (pooled, com `connect_timeout=15`) e `DIRECT_URL` (direta)
- [ ] Migrations rodando no deploy (Pre-Deploy Command ou Build Command)

**Depois**
- [ ] `/health` respondendo
- [ ] `/docs` com os endpoints listados
- [ ] Seed executado — a demo precisa ter dados
- [ ] README com aviso de cold start e links da API e do Swagger