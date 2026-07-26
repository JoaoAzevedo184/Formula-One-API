# =========================
# Stage 1 - Build
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# `prisma.config.ts` exige DATABASE_URL/DIRECT_URL só para resolver o config
# file — `generate` não chega a abrir conexão, então um valor fictício basta.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
ENV DIRECT_URL="postgresql://user:pass@localhost:5432/db"

# `prisma generate` roda antes do `tsc` porque `src/generated/` (saída do
# client Prisma) não é versionado — sem isso o build falha por import ausente.
RUN npx prisma generate

# `npm run build` compila o TS para `dist/` e copia `src/generated` para
# `dist/generated`, já que o `tsc` não copia os `.js` já gerados pelo Prisma.
RUN npm run build

# =========================
# Stage 2 - Runtime
# =========================
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

# Sem `--omit=dev`: o CLI do Prisma (devDependency) precisa estar disponível
# em runtime para rodar `prisma migrate deploy` antes de subir o servidor.
RUN npm ci

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3333

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
