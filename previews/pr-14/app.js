import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler, jsonSchemaTransform, } from "fastify-type-provider-zod";
import { healthRoutes } from "./api/v1/health.routes.js";
import { topicRoutes } from "./api/v1/topic.routes.js";
import { topicFileRoutes } from "./api/v1/topic-file.routes.js";
import authPlugin from "./api/auth.plugin.js";
import containerPlugin from "./plugins/container.plugin.js";
import { registerErrorHandler } from "./errors/error-handler.js";
import { loggerConfig } from "./lib/logger.js";
import { parseEnv } from "./lib/env.js";
import { getPrismaClient } from "./lib/prisma.js";
import { createContainer } from "./lib/container.js";
export function buildApp() {
    const env = parseEnv();
    const prisma = getPrismaClient();
    const container = createContainer(prisma, env);
    const app = Fastify({ logger: loggerConfig });
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    registerErrorHandler(app);
    app.register(cors, { origin: true });
    app.register(sensible);
    app.register(swagger, {
        openapi: {
            info: {
                title: "Dialogos API",
                version: "0.1.0",
            },
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT",
                    },
                },
            },
        },
        transform: jsonSchemaTransform,
    });
    app.register(swaggerUi, { routePrefix: "/docs" });
    app.register(containerPlugin, { container });
    app.register(authPlugin, { supabaseJwtSecret: env.SUPABASE_JWT_SECRET });
    app.register(async (v1) => {
        await v1.register(healthRoutes, { prefix: "/v1" });
        await v1.register(topicRoutes, { prefix: "/v1" });
        await v1.register(topicFileRoutes, { prefix: "/v1" });
    });
    return app;
}
