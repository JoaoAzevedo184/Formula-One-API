import { prisma } from "../src/lib/prisma.js";

/**
 * Dados reais de F1 (grid recente) para a demo não ficar com "Team 1",
 * "Driver A". Idempotente: roda com `upsert`, então pode ser executado
 * várias vezes sem duplicar registros.
 */
const teams = [
  { name: "Red Bull Racing", country: "Áustria", foundedYear: 2005 },
  { name: "Ferrari", country: "Itália", foundedYear: 1950 },
  { name: "Mercedes", country: "Alemanha", foundedYear: 1954 },
  { name: "McLaren", country: "Reino Unido", foundedYear: 1963 },
  { name: "Aston Martin", country: "Reino Unido", foundedYear: 2021 },
  { name: "Williams", country: "Reino Unido", foundedYear: 1977 },
] as const;

const drivers = [
  { name: "Max Verstappen", country: "Holanda", carNumber: 1, team: "Red Bull Racing" },
  { name: "Yuki Tsunoda", country: "Japão", carNumber: 22, team: "Red Bull Racing" },
  { name: "Charles Leclerc", country: "Mônaco", carNumber: 16, team: "Ferrari" },
  { name: "Lewis Hamilton", country: "Reino Unido", carNumber: 44, team: "Ferrari" },
  { name: "George Russell", country: "Reino Unido", carNumber: 63, team: "Mercedes" },
  { name: "Kimi Antonelli", country: "Itália", carNumber: 12, team: "Mercedes" },
  { name: "Lando Norris", country: "Reino Unido", carNumber: 4, team: "McLaren" },
  { name: "Oscar Piastri", country: "Austrália", carNumber: 81, team: "McLaren" },
  { name: "Fernando Alonso", country: "Espanha", carNumber: 14, team: "Aston Martin" },
  { name: "Lance Stroll", country: "Canadá", carNumber: 18, team: "Aston Martin" },
  { name: "Alexander Albon", country: "Tailândia", carNumber: 23, team: "Williams" },
] as const;

async function main() {
  const teamIdByName = new Map<string, string>();

  for (const team of teams) {
    const record = await prisma.team.upsert({
      where: { name: team.name },
      update: { country: team.country, foundedYear: team.foundedYear },
      create: team,
    });
    teamIdByName.set(record.name, record.id);
  }

  for (const driver of drivers) {
    const teamId = teamIdByName.get(driver.team);
    if (!teamId) {
      throw new Error(`Equipe "${driver.team}" não foi criada — verifique a lista de teams`);
    }

    await prisma.driver.upsert({
      where: { carNumber: driver.carNumber },
      update: { name: driver.name, country: driver.country, teamId },
      create: {
        name: driver.name,
        country: driver.country,
        carNumber: driver.carNumber,
        teamId,
      },
    });
  }

  console.log(`Seed concluído: ${teams.length} equipes, ${drivers.length} pilotos.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
