import { SignJWT } from "jose";

const TEST_JWT_SECRET = "test-secret-key-must-be-at-least-32-characters";

export function getTestJwtSecret(): string {
  return TEST_JWT_SECRET;
}

export async function createTestToken(studentId: string): Promise<string> {
  const secret = new TextEncoder().encode(TEST_JWT_SECRET);
  return new SignJWT({ sub: studentId, email: "test@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(secret);
}

export function authHeader(token: string): { authorization: string } {
  return { authorization: `Bearer ${token}` };
}
