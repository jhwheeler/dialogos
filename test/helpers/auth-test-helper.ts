import { signToken } from "../../src/lib/jwt.js";

const TEST_JWT_SECRET = "test-secret-key-must-be-at-least-32-characters";

export function getTestJwtSecret(): string {
  return TEST_JWT_SECRET;
}

export async function createTestToken(studentId: string): Promise<string> {
  return signToken({ studentId }, TEST_JWT_SECRET);
}

export function authHeader(token: string): { authorization: string } {
  return { authorization: `Bearer ${token}` };
}
