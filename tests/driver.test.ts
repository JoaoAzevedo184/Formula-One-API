import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { createTestApp, resetDatabase } from "./helpers/build-app.js";

async function createTeam() {
  return prisma.team.create({
    data: { name: "McLaren", country: "Reino Unido", foundedYear: 1963 },
  });
}

describe("Driver routes", () => {
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
    it("lista pilotos", async () => {
      const res = await app.inject({ method: "GET", url: "/drivers" });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });

    it("cria um piloto", async () => {
      const team = await createTeam();

      const res = await app.inject({
        method: "POST",
        url: "/drivers",
        payload: {
          name: "Ayrton Senna",
          country: "Brasil",
          carNumber: 12,
          teamId: team.id,
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({
        name: "Ayrton Senna",
        country: "Brasil",
        carNumber: 12,
        teamId: team.id,
      });
    });

    it("busca um piloto pelo id", async () => {
      const team = await createTeam();
      const driver = await prisma.driver.create({
        data: { name: "Nelson Piquet", country: "Brasil", carNumber: 5, teamId: team.id },
      });

      const res = await app.inject({ method: "GET", url: `/drivers/${driver.id}` });

      expect(res.statusCode).toBe(200);
      expect(res.json().id).toBe(driver.id);
    });

    it("atualiza um piloto", async () => {
      const team = await createTeam();
      const driver = await prisma.driver.create({
        data: { name: "Nelson Piquet", country: "Brasil", carNumber: 5, teamId: team.id },
      });

      const res = await app.inject({
        method: "PUT",
        url: `/drivers/${driver.id}`,
        payload: { carNumber: 6 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().carNumber).toBe(6);
    });

    it("remove um piloto", async () => {
      const team = await createTeam();
      const driver = await prisma.driver.create({
        data: { name: "Nelson Piquet", country: "Brasil", carNumber: 5, teamId: team.id },
      });

      const res = await app.inject({ method: "DELETE", url: `/drivers/${driver.id}` });

      expect(res.statusCode).toBe(204);
      const found = await prisma.driver.findUnique({ where: { id: driver.id } });
      expect(found).toBeNull();
    });
  });

  describe("caminhos de erro", () => {
    it("retorna 404 ao buscar um id inexistente", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/drivers/00000000-0000-0000-0000-000000000000",
      });

      expect(res.statusCode).toBe(404);
    });

    it("retorna 400 em payload inválido na criação", async () => {
      const team = await createTeam();

      const res = await app.inject({
        method: "POST",
        url: "/drivers",
        payload: { name: "", country: "Brasil", carNumber: 200, teamId: team.id },
      });

      expect(res.statusCode).toBe(400);
    });

    it("retorna 409 quando o carNumber já está em uso", async () => {
      const team = await createTeam();
      await prisma.driver.create({
        data: { name: "Piloto A", country: "Brasil", carNumber: 12, teamId: team.id },
      });

      const res = await app.inject({
        method: "POST",
        url: "/drivers",
        payload: { name: "Piloto B", country: "Brasil", carNumber: 12, teamId: team.id },
      });

      expect(res.statusCode).toBe(409);
    });
  });
});
