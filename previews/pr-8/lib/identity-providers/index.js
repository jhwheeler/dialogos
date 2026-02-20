import { ApiError } from "../../errors/api-error.js";
import { GoogleIdentityProvider } from "./google.js";
export function getIdentityProvider(provider, env) {
    switch (provider) {
        case "google":
            if (!env.GOOGLE_CLIENT_ID) {
                throw ApiError.internal("Google auth not configured");
            }
            return new GoogleIdentityProvider(env.GOOGLE_CLIENT_ID);
        default:
            throw ApiError.validation(`Unsupported provider: ${provider}`);
    }
}
