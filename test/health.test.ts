import { describe, it, expect, afterAll } from "vitest";
import { buildTestApp } from "./helpers/build-test-app.js";

describe("GET /v1/health", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  afterAll(async () => {
    await app?.close();
  });

  it("returns status ok", async () => {
    app = await buildTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/v1/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});
