import { STATUS_CODES } from "node:http";
import type { FastifyError, FastifyInstance } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import { Prisma } from "../generated/prisma/index.js";

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  issues?: { path: string; message: string }[];
}

function prismaErrorResponse(
  error: Prisma.PrismaClientKnownRequestError,
): ErrorResponse | null {
  if (error.code === "P2002") {
    const target = error.meta?.target;
    const field = Array.isArray(target) ? target.join(", ") : "campo";
    return {
      statusCode: 409,
      error: "Conflict",
      message: `${field} já está em uso`,
    };
  }

  if (error.code === "P2003") {
    return {
      statusCode: 404,
      error: "Not Found",
      message: "Recurso relacionado não existe",
    };
  }

  if (error.code === "P2025") {
    return {
      statusCode: 404,
      error: "Not Found",
      message: "Registro não encontrado",
    };
  }

  return null;
}

/**
 * Handler global de erros: garante que toda resposta de erro siga o mesmo
 * formato (`statusCode`, `error`, `message`, e `issues[]` nos 400 de validação),
 * em vez de cada controller montar sua própria resposta.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const issues = error.validation!.map((issue) => ({
        path: issue.instancePath.replace(/^\//, ""),
        message: issue.message ?? "Valor inválido",
      }));

      return reply.code(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Falha de validação",
        issues,
      } satisfies ErrorResponse);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = prismaErrorResponse(error);
      if (mapped) {
        return reply.code(mapped.statusCode).send(mapped);
      }
    }

    const statusCode =
      error.statusCode && error.statusCode >= 400 && error.statusCode < 500
        ? error.statusCode
        : 500;

    if (statusCode === 500) {
      request.log.error(error);
      return reply.code(500).send({
        statusCode: 500,
        error: "Internal Server Error",
        message: "Erro interno inesperado",
      } satisfies ErrorResponse);
    }

    return reply.code(statusCode).send({
      statusCode,
      error: STATUS_CODES[statusCode] ?? "Error",
      message: error.message,
    } satisfies ErrorResponse);
  });
}
