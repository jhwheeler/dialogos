import { GetOneTopicApiInputSchema, GetOneTopicApiOutputSchema, GetManyTopicApiOutputSchema, CreateOneTopicApiInputSchema, CreateOneTopicApiOutputSchema, UpdateOneTopicApiParamsSchema, UpdateOneTopicApiBodySchema, UpdateOneTopicApiOutputSchema, DeleteOneTopicApiInputSchema, DeleteOneTopicApiOutputSchema, } from "../../types/api/topic/index.js";
export const topicRoutes = async (fastify) => {
    const app = fastify.withTypeProvider();
    const topicService = fastify.container.services.topic;
    // GET /topics — list all non-deleted topics for the authenticated student
    app.get("/topics", {
        schema: {
            tags: ["Topics"],
            security: [{ bearerAuth: [] }],
            response: { 200: GetManyTopicApiOutputSchema },
        },
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const serviceOutput = await topicService.getMany({
            studentId: request.studentId,
        });
        return reply.send({
            topics: serviceOutput.map((topic) => ({
                ...topic,
                createdAt: topic.createdAt.toISOString(),
                updatedAt: topic.updatedAt.toISOString(),
            })),
        });
    });
    // POST /topics — create a new topic
    app.post("/topics", {
        schema: {
            tags: ["Topics"],
            security: [{ bearerAuth: [] }],
            body: CreateOneTopicApiInputSchema,
            response: { 201: CreateOneTopicApiOutputSchema },
        },
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const serviceOutput = await topicService.createOne({
            studentId: request.studentId,
            ...request.body,
        });
        return reply.status(201).send({
            ...serviceOutput,
            createdAt: serviceOutput.createdAt.toISOString(),
            updatedAt: serviceOutput.updatedAt.toISOString(),
        });
    });
    // GET /topics/:topicId — get one topic (ownership check in service)
    app.get("/topics/:topicId", {
        schema: {
            tags: ["Topics"],
            security: [{ bearerAuth: [] }],
            params: GetOneTopicApiInputSchema,
            response: { 200: GetOneTopicApiOutputSchema },
        },
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const serviceOutput = await topicService.getOne({
            id: request.params.topicId,
            studentId: request.studentId,
        });
        return reply.send({
            ...serviceOutput,
            createdAt: serviceOutput.createdAt.toISOString(),
            updatedAt: serviceOutput.updatedAt.toISOString(),
        });
    });
    // PATCH /topics/:topicId — update a topic (ownership check in service)
    app.patch("/topics/:topicId", {
        schema: {
            tags: ["Topics"],
            security: [{ bearerAuth: [] }],
            params: UpdateOneTopicApiParamsSchema,
            body: UpdateOneTopicApiBodySchema,
            response: { 200: UpdateOneTopicApiOutputSchema },
        },
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const serviceOutput = await topicService.updateOne({
            id: request.params.topicId,
            studentId: request.studentId,
            ...request.body,
        });
        return reply.send({
            ...serviceOutput,
            createdAt: serviceOutput.createdAt.toISOString(),
            updatedAt: serviceOutput.updatedAt.toISOString(),
        });
    });
    // DELETE /topics/:topicId — soft-delete (sets deletedAt)
    app.delete("/topics/:topicId", {
        schema: {
            tags: ["Topics"],
            security: [{ bearerAuth: [] }],
            params: DeleteOneTopicApiInputSchema,
            response: { 200: DeleteOneTopicApiOutputSchema },
        },
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const serviceOutput = await topicService.deleteOne({
            id: request.params.topicId,
            studentId: request.studentId,
        });
        return reply.send(serviceOutput);
    });
};
