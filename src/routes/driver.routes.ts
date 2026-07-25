import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  createDriver,
  deleteDriver,
  getDriver,
  listDrivers,
  updateDriver,
} from "../controllers/driver.controller.js";
import {
  createDriverSchema,
  driverParamsSchema,
  driverResponseSchema,
  updateDriverSchema,
} from "../schemas/driver.schema.js";

export async function driverRoutes(app: FastifyInstance): Promise<void> {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.get(
    "/drivers",
    { schema: { response: { 200: z.array(driverResponseSchema) } } },
    listDrivers,
  );

  server.get(
    "/drivers/:id",
    {
      schema: {
        params: driverParamsSchema,
        response: { 200: driverResponseSchema },
      },
    },
    getDriver,
  );

  server.post(
    "/drivers",
    {
      schema: {
        body: createDriverSchema,
        response: { 201: driverResponseSchema },
      },
    },
    createDriver,
  );

  server.put(
    "/drivers/:id",
    {
      schema: {
        params: driverParamsSchema,
        body: updateDriverSchema,
        response: { 200: driverResponseSchema },
      },
    },
    updateDriver,
  );

  server.delete(
    "/drivers/:id",
    { schema: { params: driverParamsSchema } },
    deleteDriver,
  );
}
