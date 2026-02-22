import { describe, it, expect, afterAll } from "vitest";
import { SignJWT } from "jose";
import { buildTestApp } from "./helpers/build-test-app.js";

describe("Authentication edge cases", () => {
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

  it("returns 401 when Authorization header is missing", async () => {
    const server = await getApp();

    const response = await server.inject({
      method: "GET",
      url: "/v1/topics",
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.code).toBe("AUTHENTICATION_ERROR");
  });

  it("returns 401 when Authorization header has no Bearer prefix", async () => {
    const server = await getApp();

    const response = await server.inject({
      method: "GET",
      url: "/v1/topics",
      headers: { authorization: "Token some-random-token" },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.code).toBe("AUTHENTICATION_ERROR");
  });

  it("returns 401 when token is empty after Bearer prefix", async () => {
    const server = await getApp();

    const response = await server.inject({
      method: "GET",
      url: "/v1/topics",
      headers: { authorization: "Bearer " },
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns 401 when token is malformed (not a JWT)", async () => {
    const server = await getApp();

    const response = await server.inject({
      method: "GET",
      url: "/v1/topics",
      headers: { authorization: "Bearer not-a-valid-jwt" },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.code).toBe("AUTHENTICATION_ERROR");
  });

  it("returns 401 when token is signed with the wrong secret", async () => {
    const server = await getApp();

    const wrongSecret = new TextEncoder().encode("wrong-secret-key-that-is-at-least-32-chars-long");
    const token = await new SignJWT({ sub: "some-student-id" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(wrongSecret);

    const response = await server.inject({
      method: "GET",
      url: "/v1/topics",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.code).toBe("AUTHENTICATION_ERROR");
  });

  it("returns 401 when token is expired", async () => {
    const server = await getApp();

    const secret = new TextEncoder().encode("test-secret-key-must-be-at-least-32-characters");
    const token = await new SignJWT({ sub: "some-student-id" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("-1h")
      .sign(secret);

    const response = await server.inject({
      method: "GET",
      url: "/v1/topics",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.code).toBe("AUTHENTICATION_ERROR");
  });

  it("returns 401 when token is missing the sub claim", async () => {
    const server = await getApp();

    const secret = new TextEncoder().encode("test-secret-key-must-be-at-least-32-characters");
    // JWT without `sub` claim
    const token = await new SignJWT({ email: "test@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);

    const response = await server.inject({
      method: "GET",
      url: "/v1/topics",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.code).toBe("AUTHENTICATION_ERROR");
    expect(body.message).toContain("sub");
  });
});
