import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import { signToken, verifyToken } from "../src/lib/jwt.js";

const TEST_SECRET = "test-secret-key-must-be-at-least-32-characters";
const WRONG_SECRET = "wrong-secret-key-must-be-at-least-32-characters";

describe("JWT utilities", () => {
  describe("signToken + verifyToken roundtrip", () => {
    it("returns the same studentId after sign then verify", async () => {
      const studentId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

      const token = await signToken({ studentId }, TEST_SECRET);
      const payload = await verifyToken(token, TEST_SECRET);

      expect(payload.studentId).toBe(studentId);
    });
  });

  describe("verifyToken with wrong secret", () => {
    it("throws when the token was signed with a different secret", async () => {
      // Note: getSecretKey in jwt.ts caches the first secret it receives at
      // module level, so calling signToken/verifyToken with a *different*
      // secret string still uses the cached key. To genuinely test wrong-secret
      // rejection we sign directly with jose using a different key, then try to
      // verify through the module (which uses the cached TEST_SECRET key).
      const wrongKey = new TextEncoder().encode(WRONG_SECRET);
      const tokenFromWrongKey = await new SignJWT({
        studentId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(wrongKey);

      await expect(verifyToken(tokenFromWrongKey, TEST_SECRET)).rejects.toThrow();
    });
  });

  describe("verifyToken with tampered token", () => {
    it("throws when the token payload has been modified", async () => {
      const token = await signToken(
        { studentId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
        TEST_SECRET,
      );

      // A JWT has three dot-separated parts: header.payload.signature
      // Tamper with the payload segment by flipping a character.
      const parts = token.split(".");
      const payloadPart = parts[1];
      const flipped =
        payloadPart[0] === "a" ? "b" + payloadPart.slice(1) : "a" + payloadPart.slice(1);
      const tampered = [parts[0], flipped, parts[2]].join(".");

      await expect(verifyToken(tampered, TEST_SECRET)).rejects.toThrow();
    });
  });

  describe("verifyToken with garbage string", () => {
    it("throws on a completely invalid token string", async () => {
      await expect(verifyToken("this-is-not-a-jwt", TEST_SECRET)).rejects.toThrow();
    });

    it("throws on an empty string", async () => {
      await expect(verifyToken("", TEST_SECRET)).rejects.toThrow();
    });
  });
});
