import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { signToken } from "../../lib/jwt.js";
import { ApiError } from "../../errors/api-error.js";
import { getIdentityProvider } from "../../lib/identity-providers/index.js";
import {
  TokenExchangeApiInputSchema,
  TokenExchangeApiOutputSchema,
} from "../../types/api/auth/index.js";
import { AuthenticationError } from "../../errors/authentication-error.js";
import type { StudentService } from "../../services/student/student.service.js";

const DevTokenBodySchema = z.object({
  studentId: z.string().uuid(),
});

const DevTokenOutputSchema = z.object({
  accessToken: z.string(),
});

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  if (process.env.NODE_ENV !== "production") {
    app.post("/auth/dev-token", {
      schema: {
        tags: ["Auth"],
        body: DevTokenBodySchema,
        response: { 200: DevTokenOutputSchema },
      },
    }, async (request, reply) => {
      const token = await signToken(
        { studentId: request.body.studentId },
        app.container.env.JWT_SECRET,
      );

      return reply.send({ accessToken: token });
    });
  }

  app.post("/auth/token", {
    schema: {
      tags: ["Auth"],
      body: TokenExchangeApiInputSchema,
      response: { 200: TokenExchangeApiOutputSchema },
    },
  }, async (request, reply) => {
    const identityProvider = getIdentityProvider(request.body.provider, app.container.env);

    let identity;
    try {
      identity = await identityProvider.verify(request.body.identityToken);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw ApiError.authentication(error.message);
      }
      throw error;
    }

    const studentService = app.container.services.student as StudentService;

    const student = await studentService.createOrFind({
      email: identity.email,
      displayName: identity.displayName,
    });

    const accessToken = await signToken({ studentId: student.id }, app.container.env.JWT_SECRET);

    return reply.send({
      accessToken,
      student: {
        id: student.id,
        email: student.email,
        displayName: student.displayName,
      },
    });
  });
}
