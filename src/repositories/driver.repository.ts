import { prisma } from "../lib/prisma.js";
import type { Driver } from "../generated/prisma/index.js";
import type { CreateDriverInput, UpdateDriverInput } from "../schemas/driver.schema.js";

export const driverRepository = {
  findAll(): Promise<Driver[]> {
    return prisma.driver.findMany({ orderBy: { carNumber: "asc" } });
  },

  findById(id: string): Promise<Driver | null> {
    return prisma.driver.findUnique({ where: { id } });
  },

  create(data: CreateDriverInput): Promise<Driver> {
    return prisma.driver.create({ data });
  },

  update(id: string, data: UpdateDriverInput): Promise<Driver> {
    return prisma.driver.update({ where: { id }, data });
  },

  remove(id: string): Promise<Driver> {
    return prisma.driver.delete({ where: { id } });
  },
};
