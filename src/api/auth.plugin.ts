import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { jwtVerify } from "jose";
import { ApiError } from "../errors/api-error.js";
import type { StudentService } from "../services/student/student.service.js";

declare module "fastify" {
  interface FastifyRequest {
    studentId: string;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/** Maximum number of student IDs to cache in memory. */
const MAX_KNOWN_STUDENTS = 10_000;

const authPlugin: FastifyPluginAsync<{
  supabaseJwtSecret: string;
  supabaseJwtIssuer?: string;
}> = async (fastify: FastifyInstance, opts) => {
  const secret = new TextEncoder().encode(opts.supabaseJwtSecret);
  const knownStudents = new Set<string>();

  fastify.decorateRequest("studentId", "");

  fastify.decorate("authenticate", async (request: FastifyRequest, _reply: FastifyReply) => {
    const header = request.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      throw ApiError.authentication("Missing or invalid Authorization header");
    }

    const token = header.slice(7);

    try {
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ["HS256"],
        audience: "authenticated",
        ...(opts.supabaseJwtIssuer && { issuer: opts.supabaseJwtIssuer }),
      });
      const studentId = payload.sub;

      if (!studentId) {
        throw ApiError.authentication("Token missing sub claim");
      }

      request.studentId = studentId;

      if (!knownStudents.has(studentId)) {
        const studentService = fastify.container.services.student as StudentService;
        await studentService.ensureExists({
          id: studentId,
          email: (payload.email as string) ?? "",
          displayName:
            ((payload.user_metadata as Record<string, unknown>)?.full_name as string) ??
            (payload.email as string) ??
            "",
        });

        // Evict oldest entry if cache is full to bound memory growth
        if (knownStudents.size >= MAX_KNOWN_STUDENTS) {
          const first = knownStudents.values().next().value;
          if (first !== undefined) knownStudents.delete(first);
        }
        knownStudents.add(studentId);
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.authentication("Invalid or expired token");
    }
  });
};

export default fp(authPlugin, { name: "auth" });
