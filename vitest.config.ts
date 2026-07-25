import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5434/api-formula-one-test",
    },
    globalSetup: ["./tests/global-setup.ts"],
    // Todos os testes compartilham o mesmo banco truncado a cada `beforeEach`;
    // rodar arquivos em paralelo causaria testes limpando a tabela uns dos outros.
    fileParallelism: false,
  },
});
