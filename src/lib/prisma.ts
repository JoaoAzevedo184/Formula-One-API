import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/index.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não definida no ambiente");
}

// Prisma 7 não lê a URL do schema.prisma: a conexão vem do driver adapter.
// Instância única para não abrir múltiplos pools de conexão.
const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
