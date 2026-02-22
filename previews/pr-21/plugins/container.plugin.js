import fp from "fastify-plugin";
const containerPlugin = async (fastify, opts) => {
    fastify.decorate("container", opts.container);
};
export default fp(containerPlugin, { name: "container" });
