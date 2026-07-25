import { buildApp } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

/**
 * Instância de teste via `app.inject()` — nunca abre porta de rede.
 */
export function createTestApp() {
  return buildApp();
}

/**
 * Limpa as tabelas entre os testes para que cada um comece de um estado
 * conhecido, sem depender da ordem de execução.
 */
export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "drivers", "teams" RESTART IDENTITY CASCADE',
  );
}
