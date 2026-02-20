import fp from "fastify-plugin";
import { verifyToken } from "../lib/jwt.js";
import { ApiError } from "../errors/api-error.js";
const authPlugin = async (fastify, opts) => {
    fastify.decorateRequest("studentId", "");
    fastify.decorate("authenticate", async (request, _reply) => {
        const header = request.headers.authorization;
        if (!header || !header.startsWith("Bearer ")) {
            throw ApiError.authentication("Missing or invalid Authorization header");
        }
        const token = header.slice(7);
        try {
            const payload = await verifyToken(token, opts.jwtSecret);
            request.studentId = payload.studentId;
        }
        catch {
            throw ApiError.authentication("Invalid or expired token");
        }
    });
};
export default fp(authPlugin, { name: "auth" });
