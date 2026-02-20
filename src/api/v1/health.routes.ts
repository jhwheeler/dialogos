import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

const HealthOutputSchema = z.object({ status: z.literal("ok") });

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        response: { 200: HealthOutputSchema },
      },
    },
    async () => {
      return { status: "ok" as const };
    },
  );
}
