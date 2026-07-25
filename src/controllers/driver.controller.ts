import type { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "../generated/prisma/index.js";
import { driverRepository } from "../repositories/driver.repository.js";
import type {
  CreateDriverInput,
  DriverParams,
  UpdateDriverInput,
} from "../schemas/driver.schema.js";

function isPrismaKnownError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export async function listDrivers(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const drivers = await driverRepository.findAll();
  return reply.send(drivers);
}

export async function getDriver(
  request: FastifyRequest<{ Params: DriverParams }>,
  reply: FastifyReply,
) {
  const driver = await driverRepository.findById(request.params.id);

  if (!driver) {
    return reply.code(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "Piloto não encontrado",
    });
  }

  return reply.send(driver);
}

export async function createDriver(
  request: FastifyRequest<{ Body: CreateDriverInput }>,
  reply: FastifyReply,
) {
  try {
    const driver = await driverRepository.create(request.body);
    return reply.code(201).send(driver);
  } catch (error) {
    if (isPrismaKnownError(error)) {
      if (error.code === "P2002") {
        return reply.code(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "carNumber já está em uso",
        });
      }
      if (error.code === "P2003") {
        return reply.code(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Equipe informada em teamId não existe",
        });
      }
    }
    throw error;
  }
}

export async function updateDriver(
  request: FastifyRequest<{ Params: DriverParams; Body: UpdateDriverInput }>,
  reply: FastifyReply,
) {
  try {
    const driver = await driverRepository.update(
      request.params.id,
      request.body,
    );
    return reply.send(driver);
  } catch (error) {
    if (isPrismaKnownError(error)) {
      if (error.code === "P2002") {
        return reply.code(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "carNumber já está em uso por outro piloto",
        });
      }
      if (error.code === "P2025") {
        return reply.code(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Piloto não encontrado",
        });
      }
      if (error.code === "P2003") {
        return reply.code(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Equipe informada em teamId não existe",
        });
      }
    }
    throw error;
  }
}

export async function deleteDriver(
  request: FastifyRequest<{ Params: DriverParams }>,
  reply: FastifyReply,
) {
  try {
    await driverRepository.remove(request.params.id);
    return reply.code(204).send();
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === "P2025") {
      return reply.code(404).send({
        statusCode: 404,
        error: "Not Found",
        message: "Piloto não encontrado",
      });
    }
    throw error;
  }
}
