import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from "fastify-type-provider-zod";

import { healthRoutes } from "./api/v1/health.routes.js";
import { topicRoutes } from "./api/v1/topic.routes.js";
import { topicFileRoutes } from "./api/v1/topic-file.routes.js";
import { sourceRoutes } from "./api/v1/source.routes.js";
import { sessionRoutes } from "./api/v1/session.routes.js";
import { turnRoutes } from "./api/v1/turn.routes.js";
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

  const app = Fastify({
    logger: loggerConfig,
    bodyLimit: 1_048_576, // 1 MB default; routes needing more override per-route
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  registerErrorHandler(app);

  // --- Security: CORS with explicit allowlist (A7.1) ---
  const corsOrigin = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : env.NODE_ENV === "production"
      ? false
      : true; // permissive only in dev/test
  app.register(cors, { origin: corsOrigin, credentials: true });

  // --- Security: HTTP headers (A7.2) ---
  app.register(helmet, {
    contentSecurityPolicy: false, // API-only, no HTML to protect
    hsts: { maxAge: 31536000 },
  });

  // --- Security: Rate limiting (A7.3) ---
  app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

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

  // --- Security: Swagger UI restricted to non-production (A3.2) ---
  if (env.NODE_ENV !== "production") {
    app.register(swaggerUi, { routePrefix: "/docs" });
  }

  app.register(containerPlugin, { container });
  app.register(authPlugin, {
    supabaseJwtSecret: env.SUPABASE_JWT_SECRET,
    supabaseJwtIssuer: env.SUPABASE_JWT_ISSUER,
  });

  app.register(async (v1) => {
    await v1.register(healthRoutes, { prefix: "/v1" });
    await v1.register(topicRoutes, { prefix: "/v1" });
    await v1.register(topicFileRoutes, { prefix: "/v1" });
    await v1.register(sourceRoutes, { prefix: "/v1" });
    await v1.register(sessionRoutes, { prefix: "/v1" });
    await v1.register(turnRoutes, { prefix: "/v1" });
  });

  return app;
}
