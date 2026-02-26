import { buildApp } from "./app.js";
import { parseEnv } from "./lib/env.js";

async function main() {
  const env = parseEnv();
  const app = buildApp();

  // Graceful shutdown: close connections cleanly before exiting
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

main().catch((error: unknown) => {
  // Node v24 util.inspect crashes on some error objects (e.g. Zod errors),
  // so print the stack string directly instead of passing the object.
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(message);
  process.exit(1);
});
