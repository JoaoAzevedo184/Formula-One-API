import { prisma } from "../lib/prisma.js";
import type { Driver, Team } from "../generated/prisma/index.js";
import type { CreateTeamInput, UpdateTeamInput } from "../schemas/team.schema.js";

export type TeamWithDrivers = Team & { drivers: Driver[] };

export const teamRepository = {
  findAll(): Promise<Team[]> {
    return prisma.team.findMany({ orderBy: { name: "asc" } });
  },

  findById(id: string): Promise<TeamWithDrivers | null> {
    return prisma.team.findUnique({ where: { id }, include: { drivers: true } });
  },

  create(data: CreateTeamInput): Promise<Team> {
    return prisma.team.create({ data });
  },

  update(id: string, data: UpdateTeamInput): Promise<Team> {
    return prisma.team.update({ where: { id }, data });
  },

  remove(id: string): Promise<Team> {
    return prisma.team.delete({ where: { id } });
  },
};
