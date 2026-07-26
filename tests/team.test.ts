import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { createTestApp, resetDatabase } from "./helpers/build-app.js";

async function createTeam(overrides: Partial<{ name: string; country: string; foundedYear: number }> = {}) {
  return prisma.team.create({
    data: {
      name: "McLaren",
      country: "Reino Unido",
      foundedYear: 1963,
      ...overrides,
    },
  });
}

describe("Team routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = createTestApp();
    await app.ready();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe("caminho feliz", () => {
    it("lista equipes", async () => {
      const res = await app.inject({ method: "GET", url: "/teams" });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });

    it("cria uma equipe", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/teams",
        payload: { name: "Ferrari", country: "Itália", foundedYear: 1950 },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({
        name: "Ferrari",
        country: "Itália",
        foundedYear: 1950,
      });
    });

    it("busca uma equipe pelo id, incluindo os pilotos", async () => {
      const team = await createTeam();
      await prisma.driver.create({
        data: { name: "Ayrton Senna", country: "Brasil", carNumber: 12, teamId: team.id },
      });

      const res = await app.inject({ method: "GET", url: `/teams/${team.id}` });

      expect(res.statusCode).toBe(200);
      expect(res.json().id).toBe(team.id);
      expect(res.json().drivers).toHaveLength(1);
      expect(res.json().drivers[0]).toMatchObject({ name: "Ayrton Senna", carNumber: 12 });
    });

    it("atualiza uma equipe", async () => {
      const team = await createTeam();

      const res = await app.inject({
        method: "PUT",
        url: `/teams/${team.id}`,
        payload: { foundedYear: 1966 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().foundedYear).toBe(1966);
    });

    it("remove uma equipe sem pilotos associados", async () => {
      const team = await createTeam();

      const res = await app.inject({ method: "DELETE", url: `/teams/${team.id}` });

      expect(res.statusCode).toBe(204);
      const found = await prisma.team.findUnique({ where: { id: team.id } });
      expect(found).toBeNull();
    });
  });

  describe("caminhos de erro", () => {
    it("retorna 404 ao buscar um id inexistente", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/teams/00000000-0000-0000-0000-000000000000",
      });

      expect(res.statusCode).toBe(404);
    });

    it("retorna 400 em payload inválido na criação", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/teams",
        payload: { name: "", country: "Itália", foundedYear: 1800 },
      });

      expect(res.statusCode).toBe(400);
    });

    it("retorna 409 quando o name já está em uso", async () => {
      await createTeam({ name: "Ferrari" });

      const res = await app.inject({
        method: "POST",
        url: "/teams",
        payload: { name: "Ferrari", country: "Itália", foundedYear: 1950 },
      });

      expect(res.statusCode).toBe(409);
    });

    it("retorna 404 ao remover um id inexistente", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: "/teams/00000000-0000-0000-0000-000000000000",
      });

      expect(res.statusCode).toBe(404);
    });

    it("retorna 409 ao remover uma equipe com pilotos associados", async () => {
      const team = await createTeam();
      await prisma.driver.create({
        data: { name: "Ayrton Senna", country: "Brasil", carNumber: 12, teamId: team.id },
      });

      const res = await app.inject({ method: "DELETE", url: `/teams/${team.id}` });

      expect(res.statusCode).toBe(409);
    });
  });
});
