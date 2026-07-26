import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { driverRoutes } from "./routes/driver.routes.js";
import { healthRoutes } from "./routes/health.routes.js";
import { teamRoutes } from "./routes/team.routes.js";

/**
 * Monta a instância do Fastify com tudo registrado, mas sem chamar `listen()`.
 * Isso permite que os testes usem `app.inject()` sem abrir porta de rede.
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(healthRoutes);
  app.register(driverRoutes);
  app.register(teamRoutes);

  return app;
}
