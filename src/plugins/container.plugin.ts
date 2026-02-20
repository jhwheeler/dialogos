import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import type { AppContainer } from "../lib/container.js";

declare module "fastify" {
  interface FastifyInstance {
    container: AppContainer;
  }
}

const containerPlugin: FastifyPluginAsync<{ container: AppContainer }> = async (fastify, opts) => {
  fastify.decorate("container", opts.container);
};

export default fp(containerPlugin, { name: "container" });
