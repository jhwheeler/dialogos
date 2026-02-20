import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildTestApp } from "./helpers/build-test-app.js";
import { verifyToken } from "../src/lib/jwt.js";

const TEST_JWT_SECRET = "test-secret-key-must-be-at-least-32-characters";

describe("Auth routes", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  describe("POST /v1/auth/dev-token", () => {
    it("returns a valid JWT for a given studentId", async () => {
      const studentId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

      const response = await app.inject({
        method: "POST",
        url: "/v1/auth/dev-token",
        payload: { studentId },
      });

      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body).toHaveProperty("accessToken");
      expect(typeof body.accessToken).toBe("string");

      // Verify the token decodes to the correct studentId
      const payload = await verifyToken(body.accessToken, TEST_JWT_SECRET);
      expect(payload.studentId).toBe(studentId);
    });

    it("returns 400 when body is empty", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/auth/dev-token",
        payload: {},
      });

      expect(response.statusCode).toBe(400);

      const body = response.json();
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when studentId is not a valid UUID", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/auth/dev-token",
        payload: { studentId: "not-a-uuid" },
      });

      expect(response.statusCode).toBe(400);

      const body = response.json();
      expect(body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /v1/auth/token", () => {
    it("returns 400 when body is empty", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/auth/token",
        payload: {},
      });

      expect(response.statusCode).toBe(400);

      const body = response.json();
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 when provider is unsupported", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/v1/auth/token",
        payload: { provider: "facebook", identityToken: "some-token" },
      });

      expect(response.statusCode).toBe(400);

      const body = response.json();
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 500 when GOOGLE_CLIENT_ID is not configured", async () => {
      // In the test environment GOOGLE_CLIENT_ID is not set, so the
      // identity-provider factory throws ApiError.internal("Google auth not configured").
      const response = await app.inject({
        method: "POST",
        url: "/v1/auth/token",
        payload: { provider: "google", identityToken: "invalid-token" },
      });

      expect(response.statusCode).toBe(500);

      const body = response.json();
      expect(body.code).toBe("INTERNAL_SERVER_ERROR");
      expect(body.message).toBe("Google auth not configured");
    });
  });
});
