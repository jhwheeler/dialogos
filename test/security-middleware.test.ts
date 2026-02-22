import { describe, it, expect, afterAll } from "vitest";
import { buildTestApp } from "./helpers/build-test-app.js";

describe("Security middleware", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  afterAll(async () => {
    await app?.close();
  });

  async function getApp() {
    if (!app) {
      app = await buildTestApp();
    }
    return app;
  }

  // ─── Helmet headers ────────────────────────────────────────────

  describe("Helmet security headers", () => {
    it("includes X-Content-Type-Options header", async () => {
      const server = await getApp();

      const response = await server.inject({
        method: "GET",
        url: "/v1/health",
      });

      expect(response.headers["x-content-type-options"]).toBe("nosniff");
    });

    it("includes X-Frame-Options header", async () => {
      const server = await getApp();

      const response = await server.inject({
        method: "GET",
        url: "/v1/health",
      });

      expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    });
  });

  // ─── Rate limiting ─────────────────────────────────────────────

  describe("Rate limiting", () => {
    it("includes rate limit headers in responses", async () => {
      const server = await getApp();

      const response = await server.inject({
        method: "GET",
        url: "/v1/health",
      });

      expect(response.headers["x-ratelimit-limit"]).toBeDefined();
      expect(response.headers["x-ratelimit-remaining"]).toBeDefined();
    });
  });

  // ─── Swagger UI availability ───────────────────────────────────

  describe("Swagger UI", () => {
    it("serves Swagger UI in test environment", async () => {
      const server = await getApp();

      const response = await server.inject({
        method: "GET",
        url: "/docs/static/index.html",
      });

      // In test env (NODE_ENV=test), Swagger UI should be available
      expect(response.statusCode).not.toBe(404);
    });
  });
});
