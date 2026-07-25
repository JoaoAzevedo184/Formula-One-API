import type { FastifyInstance } from "fastify";

/**
 * Endpoint de liveness. Não toca no banco de propósito: responde mesmo que o
 * Postgres esteja fora do ar, servindo para o orquestrador saber que o
 * processo está de pé.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });
}
