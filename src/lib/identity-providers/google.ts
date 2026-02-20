import { createRemoteJWKSet, jwtVerify } from "jose";
import { AuthenticationError } from "../../errors/authentication-error.js";

export interface IdentityProviderResult {
  email: string;
  displayName: string;
  providerId: string;
}

const GOOGLE_JWKS_URL = new URL("https://www.googleapis.com/oauth2/v3/certs");

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

const jwks = createRemoteJWKSet(GOOGLE_JWKS_URL);

export class GoogleIdentityProvider {
  constructor(private readonly clientId: string) {}

  async verify(identityToken: string): Promise<IdentityProviderResult> {
    try {
      const { payload } = await jwtVerify(identityToken, jwks, {
        issuer: GOOGLE_ISSUERS,
        audience: this.clientId,
      });

      const email = payload.email as string | undefined;

      if (!email) {
        throw new AuthenticationError("Google token missing email claim");
      }

      const displayName = (payload.name as string | undefined) ?? email;
      const providerId = payload.sub;

      if (!providerId) {
        throw new AuthenticationError("Google token missing sub claim");
      }

      return { email, displayName, providerId };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      throw new AuthenticationError(
        error instanceof Error
          ? `Google token verification failed: ${error.message}`
          : "Google token verification failed",
      );
    }
  }
}
