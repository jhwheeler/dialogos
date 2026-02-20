import { createRemoteJWKSet, jwtVerify } from "jose";
import { AuthenticationError } from "../../errors/authentication-error.js";
const GOOGLE_JWKS_URL = new URL("https://www.googleapis.com/oauth2/v3/certs");
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const jwks = createRemoteJWKSet(GOOGLE_JWKS_URL);
export class GoogleIdentityProvider {
    clientId;
    constructor(clientId) {
        this.clientId = clientId;
    }
    async verify(identityToken) {
        try {
            const { payload } = await jwtVerify(identityToken, jwks, {
                issuer: GOOGLE_ISSUERS,
                audience: this.clientId,
            });
            const email = payload.email;
            if (!email) {
                throw new AuthenticationError("Google token missing email claim");
            }
            const displayName = payload.name ?? email;
            const providerId = payload.sub;
            if (!providerId) {
                throw new AuthenticationError("Google token missing sub claim");
            }
            return { email, displayName, providerId };
        }
        catch (error) {
            if (error instanceof AuthenticationError) {
                throw error;
            }
            throw new AuthenticationError(error instanceof Error
                ? `Google token verification failed: ${error.message}`
                : "Google token verification failed");
        }
    }
}
