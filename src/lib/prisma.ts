import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';

// Prisma 7 não lê a URL do schema.prisma: a conexão vem do driver adapter.
// Instância única para não abrir múltiplos pools de conexão.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });