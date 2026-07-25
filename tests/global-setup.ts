import { execSync } from "node:child_process";
import { Client } from "pg";

/**
 * Estratégia de isolamento do banco de teste:
 * os testes rodam contra um banco Postgres dedicado (`api-formula-one-test`),
 * separado do banco de desenvolvimento (`api-formula-one`), no mesmo container
 * Docker local. Este setup roda uma única vez antes de toda a suíte: cria o
 * banco se não existir e aplica as migrations. O isolamento *entre* testes
 * (limpar as tabelas a cada `beforeEach`) fica em `tests/helpers/build-app.ts`.
 *
 * Pré-requisito: `docker compose up -d` rodando (ver docker-compose.yml).
 */

const ADMIN_URL = "postgresql://postgres:postgres@localhost:5434/postgres";
const TEST_DB_NAME = "api-formula-one-test";

export const TEST_DATABASE_URL = `postgresql://postgres:postgres@localhost:5434/${TEST_DB_NAME}`;

export async function setup(): Promise<void> {
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();

  const { rowCount } = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [TEST_DB_NAME],
  );

  if (rowCount === 0) {
    await admin.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
  }

  await admin.end();

  execSync("npx prisma migrate deploy", {
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL,
    },
    stdio: "pipe",
  });
}
