import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

export function swaggerPlugin(app: FastifyInstance): void {
  app.register(swagger, {
    openapi: {
      info: {
        title: "Formula One API",
        description:
          "API REST para gerenciamento de pilotos e equipes da Fórmula 1.",
        version: "1.0.0",
      },
    },
    transform: jsonSchemaTransform,
  });

  app.register(swaggerUi, {
    routePrefix: "/docs",
  });
}
