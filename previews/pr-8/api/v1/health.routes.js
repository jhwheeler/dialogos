import { z } from "zod";
const HealthOutputSchema = z.object({ status: z.literal("ok") });
export async function healthRoutes(fastify) {
    const app = fastify.withTypeProvider();
    app.get("/health", {
        schema: {
            tags: ["Health"],
            response: { 200: HealthOutputSchema },
        },
    }, async () => {
        return { status: "ok" };
    });
}
