import { buildApp } from "../../src/app.js";

export async function buildTestApp() {
  // Set test env vars before building
  process.env.NODE_ENV = "test";
  process.env.SUPABASE_JWT_SECRET = "test-secret-key-must-be-at-least-32-characters";
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54422/dialogos_test";
  // Clear issuer so auth plugin doesn't require it — test tokens omit the iss claim
  delete process.env.SUPABASE_JWT_ISSUER;

  const app = buildApp();
  await app.ready();
  return app;
}
