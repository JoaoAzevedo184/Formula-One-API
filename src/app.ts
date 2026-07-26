import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { securityPlugin } from "./plugins/security.js";
import { swaggerPlugin } from "./plugins/swagger.js";
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

  // Chamados direto na raiz (sem `app.register`): usar `app.register` aqui
  // criaria um contexto encapsulado, e o onRoute hook do swagger (e os
  // hooks de segurança) não veriam as rotas de drivers/teams, registradas
  // como filhas irmãs na raiz.
  registerErrorHandler(app);
  securityPlugin(app);
  swaggerPlugin(app);

  app.register(healthRoutes);
  app.register(driverRoutes);
  app.register(teamRoutes);

  return app;
}
