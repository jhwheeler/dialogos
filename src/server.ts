import { buildApp } from "./app.js";
import { parseEnv } from "./lib/env.js";

async function main() {
  const env = parseEnv();
  const app = buildApp();

  // Graceful shutdown on SIGTERM/SIGINT (A10.2)
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, async () => {
      app.log.info({ signal }, "Received signal, shutting down gracefully");
      await app.close();
      process.exit(0);
    });
  }

  await app.listen({
    host: env.HOST,
    port: env.PORT,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
