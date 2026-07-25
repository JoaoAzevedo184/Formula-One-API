import { z } from "zod";

export const driverParamsSchema = z.object({
  id: z.uuid("id deve ser um UUID válido"),
});

export const createDriverSchema = z
  .object({
    name: z.string().min(1).max(80),
    country: z.string().min(2).max(56),
    carNumber: z.number().int().min(1).max(99),
    teamId: z.uuid("teamId deve ser um UUID válido"),
  })
  .strict();

export const updateDriverSchema = createDriverSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Corpo não pode ser vazio",
  });

export const driverResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  country: z.string(),
  carNumber: z.number().int(),
  teamId: z.uuid(),
  createdAt: z.date(),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type DriverParams = z.infer<typeof driverParamsSchema>;
