import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import Fastify from "fastify";

import { healthRoutes } from "./api/v1/health.routes.js";
import { loggerConfig } from "./lib/logger.js";

export function buildApp() {
  const app = Fastify({ logger: loggerConfig });

  app.register(cors, { origin: true });
  app.register(sensible);

  app.register(async (v1) => {
    await v1.register(healthRoutes, { prefix: "/v1" });
  });

  return app;
}
