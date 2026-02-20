import { buildApp } from "../../src/app.js";

export async function buildTestApp() {
  // Set test env vars before building
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret-key-must-be-at-least-32-characters";
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54422/postgres";

  const app = buildApp();
  await app.ready();
  return app;
}
