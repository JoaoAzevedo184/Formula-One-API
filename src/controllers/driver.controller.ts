import type { FastifyReply, FastifyRequest } from "fastify";
import { driverRepository } from "../repositories/driver.repository.js";
import type {
  CreateDriverInput,
  DriverParams,
  UpdateDriverInput,
} from "../schemas/driver.schema.js";

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
  const driver = await driverRepository.create(request.body);
  return reply.code(201).send(driver);
}

export async function updateDriver(
  request: FastifyRequest<{ Params: DriverParams; Body: UpdateDriverInput }>,
  reply: FastifyReply,
) {
  const driver = await driverRepository.update(
    request.params.id,
    request.body,
  );
  return reply.send(driver);
}

export async function deleteDriver(
  request: FastifyRequest<{ Params: DriverParams }>,
  reply: FastifyReply,
) {
  await driverRepository.remove(request.params.id);
  return reply.code(204).send();
}
