import fp from "fastify-plugin";
import { jwtVerify } from "jose";
import { ApiError } from "../errors/api-error.js";
const authPlugin = async (fastify, opts) => {
    const secret = new TextEncoder().encode(opts.supabaseJwtSecret);
    const knownStudents = new Set();
    fastify.decorateRequest("studentId", "");
    fastify.decorate("authenticate", async (request, _reply) => {
        const header = request.headers.authorization;
        if (!header || !header.startsWith("Bearer ")) {
            throw ApiError.authentication("Missing or invalid Authorization header");
        }
        const token = header.slice(7);
        try {
            const { payload } = await jwtVerify(token, secret);
            const studentId = payload.sub;
            if (!studentId) {
                throw ApiError.authentication("Token missing sub claim");
            }
            request.studentId = studentId;
            if (!knownStudents.has(studentId)) {
                const studentService = fastify.container.services.student;
                await studentService.ensureExists({
                    id: studentId,
                    email: payload.email ?? "",
                    displayName: payload.user_metadata?.full_name ??
                        payload.email ??
                        "",
                });
                knownStudents.add(studentId);
            }
        }
        catch (error) {
            if (error instanceof ApiError)
                throw error;
            throw ApiError.authentication("Invalid or expired token");
        }
    });
};
export default fp(authPlugin, { name: "auth" });
