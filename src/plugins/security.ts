import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

/**
 * `contentSecurityPolicy: false` porque o Swagger UI (`/docs`) usa estilos e
 * scripts inline; a CSP padrão do helmet bloquearia a própria página de docs.
 */
export function securityPlugin(app: FastifyInstance): void {
  app.register(helmet, { contentSecurityPolicy: false });
  app.register(cors);
  app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
}
