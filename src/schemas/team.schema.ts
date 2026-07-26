import { z } from "zod";

export const teamParamsSchema = z.object({
  id: z.uuid("id deve ser um UUID válido"),
});

export const createTeamSchema = z
  .object({
    name: z.string().min(1).max(80),
    country: z.string().min(2).max(56),
    foundedYear: z
      .number()
      .int()
      .min(1900)
      .max(new Date().getFullYear()),
  })
  .strict();

export const updateTeamSchema = createTeamSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Corpo não pode ser vazio",
  });

export const teamResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  country: z.string(),
  foundedYear: z.number().int(),
  createdAt: z.date(),
});

export const teamWithDriversResponseSchema = teamResponseSchema.extend({
  drivers: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      country: z.string(),
      carNumber: z.number().int(),
      createdAt: z.date(),
    }),
  ),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type TeamParams = z.infer<typeof teamParamsSchema>;
