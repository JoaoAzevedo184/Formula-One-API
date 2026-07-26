import type { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "../generated/prisma/index.js";
import { teamRepository } from "../repositories/team.repository.js";
import type {
  CreateTeamInput,
  TeamParams,
  UpdateTeamInput,
} from "../schemas/team.schema.js";

function isPrismaKnownError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export async function listTeams(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const teams = await teamRepository.findAll();
  return reply.send(teams);
}

export async function getTeam(
  request: FastifyRequest<{ Params: TeamParams }>,
  reply: FastifyReply,
) {
  const team = await teamRepository.findById(request.params.id);

  if (!team) {
    return reply.code(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "Equipe não encontrada",
    });
  }

  return reply.send(team);
}

export async function createTeam(
  request: FastifyRequest<{ Body: CreateTeamInput }>,
  reply: FastifyReply,
) {
  try {
    const team = await teamRepository.create(request.body);
    return reply.code(201).send(team);
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === "P2002") {
      return reply.code(409).send({
        statusCode: 409,
        error: "Conflict",
        message: "name já está em uso",
      });
    }
    throw error;
  }
}

export async function updateTeam(
  request: FastifyRequest<{ Params: TeamParams; Body: UpdateTeamInput }>,
  reply: FastifyReply,
) {
  try {
    const team = await teamRepository.update(request.params.id, request.body);
    return reply.send(team);
  } catch (error) {
    if (isPrismaKnownError(error)) {
      if (error.code === "P2002") {
        return reply.code(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "name já está em uso por outra equipe",
        });
      }
      if (error.code === "P2025") {
        return reply.code(404).send({
          statusCode: 404,
          error: "Not Found",
          message: "Equipe não encontrada",
        });
      }
    }
    throw error;
  }
}

export async function deleteTeam(
  request: FastifyRequest<{ Params: TeamParams }>,
  reply: FastifyReply,
) {
  const team = await teamRepository.findById(request.params.id);

  if (!team) {
    return reply.code(404).send({
      statusCode: 404,
      error: "Not Found",
      message: "Equipe não encontrada",
    });
  }

  if (team.drivers.length > 0) {
    return reply.code(409).send({
      statusCode: 409,
      error: "Conflict",
      message: "Equipe possui pilotos associados",
    });
  }

  await teamRepository.remove(request.params.id);
  return reply.code(204).send();
}
