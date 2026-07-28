import { env } from './config/env.js';
import { buildApp } from './app.js';
import { prisma } from './lib/prisma.js';

const app = buildApp();

// `0.0.0.0` e a porta vinda do ambiente são exigidos pelo Render — escutar só
// em localhost ou numa porta fixa é a causa nº 1 de falha no deploy.
async function start() {
  try {
    const address = await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`Servidor rodando em ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// O Render envia SIGTERM a cada novo deploy. Sem isso, requisições em andamento
// são cortadas e as conexões do Prisma ficam órfãs no Neon.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    app.log.info(`${signal} recebido, encerrando...`);
    try {
      await app.close();
      await prisma.$disconnect();
      process.exit(0);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  });
}

start();