import type { FastifyInstance } from "fastify";
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

export async function authRoutes(app: FastifyInstance): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    app.post("/auth/dev-token", async (request, reply) => {
      const validation = DevTokenBodySchema.safeParse(request.body);

      if (!validation.success) {
        throw ApiError.validation("Invalid request body", validation.error);
      }

      const token = await signToken(
        { studentId: validation.data.studentId },
        app.container.env.JWT_SECRET,
      );

      return reply.send({ accessToken: token });
    });
  }

  app.post("/auth/token", async (request, reply) => {
    const inputValidation = TokenExchangeApiInputSchema.safeParse(request.body);

    if (!inputValidation.success) {
      throw ApiError.validation("Invalid request body", inputValidation.error);
    }

    const identityProvider = getIdentityProvider(inputValidation.data.provider, app.container.env);

    let identity;
    try {
      identity = await identityProvider.verify(inputValidation.data.identityToken);
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

    const outputValidation = TokenExchangeApiOutputSchema.safeParse({
      accessToken,
      student: {
        id: student.id,
        email: student.email,
        displayName: student.displayName,
      },
    });

    if (!outputValidation.success) {
      throw ApiError.internal("Invalid service response", outputValidation.error);
    }

    return reply.send(outputValidation.data);
  });
}
