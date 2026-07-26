import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  createTeam,
  deleteTeam,
  getTeam,
  listTeams,
  updateTeam,
} from "../controllers/team.controller.js";
import {
  createTeamSchema,
  teamParamsSchema,
  teamResponseSchema,
  teamWithDriversResponseSchema,
  updateTeamSchema,
} from "../schemas/team.schema.js";

export async function teamRoutes(app: FastifyInstance): Promise<void> {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/teams",
    { schema: { response: { 200: z.array(teamResponseSchema) } } },
    listTeams,
  );

  server.get(
    "/teams/:id",
    {
      schema: {
        params: teamParamsSchema,
        response: { 200: teamWithDriversResponseSchema },
      },
    },
    getTeam,
  );

  server.post(
    "/teams",
    {
      schema: {
        body: createTeamSchema,
        response: { 201: teamResponseSchema },
      },
    },
    createTeam,
  );

  server.put(
    "/teams/:id",
    {
      schema: {
        params: teamParamsSchema,
        body: updateTeamSchema,
        response: { 200: teamResponseSchema },
      },
    },
    updateTeam,
  );

  server.delete(
    "/teams/:id",
    { schema: { params: teamParamsSchema } },
    deleteTeam,
  );
}
