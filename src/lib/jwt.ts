import { SignJWT, jwtVerify } from "jose";

export interface JwtPayload {
  studentId: string;
}

let cachedSecret: string | undefined;
let cachedKey: Uint8Array | undefined;

function getSecretKey(secret: string): Uint8Array {
  if (!cachedKey || cachedSecret !== secret) {
    cachedSecret = secret;
    cachedKey = new TextEncoder().encode(secret);
  }
  return cachedKey;
}

export async function signToken(payload: JwtPayload, secret: string): Promise<string> {
  return new SignJWT({ studentId: payload.studentId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey(secret));
}

export async function verifyToken(token: string, secret: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getSecretKey(secret));
  return { studentId: payload.studentId as string };
}
