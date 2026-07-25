import "dotenv/config";
import { buildApp } from "./app.js";

const app = buildApp();

// `0.0.0.0` e `process.env.PORT` são exigidos pelo Render — escutar só em
// localhost ou numa porta fixa é a causa nº 1 de falha no deploy.
const port = Number(process.env.PORT) || 3333;
const host = "0.0.0.0";

app
  .listen({ port, host })
  .then((address) => {
    app.log.info(`Servidor rodando em ${address}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
