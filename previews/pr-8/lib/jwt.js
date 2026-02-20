import { SignJWT, jwtVerify } from "jose";
let cachedSecret;
let cachedKey;
function getSecretKey(secret) {
    if (!cachedKey || cachedSecret !== secret) {
        cachedSecret = secret;
        cachedKey = new TextEncoder().encode(secret);
    }
    return cachedKey;
}
export async function signToken(payload, secret) {
    return new SignJWT({ studentId: payload.studentId })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(getSecretKey(secret));
}
export async function verifyToken(token, secret) {
    const { payload } = await jwtVerify(token, getSecretKey(secret));
    return { studentId: payload.studentId };
}
