import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { verifyToken } from "../lib/jwt.js";
import { ApiError } from "../errors/api-error.js";

declare module "fastify" {
  interface FastifyRequest {
    studentId: string;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync<{ jwtSecret: string }> = async (
  fastify: FastifyInstance,
  opts,
) => {
  fastify.decorateRequest("studentId", "");

  fastify.decorate("authenticate", async (request: FastifyRequest, _reply: FastifyReply) => {
    const header = request.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      throw ApiError.authentication("Missing or invalid Authorization header");
    }

    const token = header.slice(7);

    try {
      const payload = await verifyToken(token, opts.jwtSecret);
      request.studentId = payload.studentId;
    } catch {
      throw ApiError.authentication("Invalid or expired token");
    }
  });
};

export default fp(authPlugin, { name: "auth" });
