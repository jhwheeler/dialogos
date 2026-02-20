import { GetOneTopicApiInputSchema, GetOneTopicApiOutputSchema, GetManyTopicApiOutputSchema, CreateOneTopicApiInputSchema, CreateOneTopicApiOutputSchema, UpdateOneTopicApiParamsSchema, UpdateOneTopicApiBodySchema, UpdateOneTopicApiOutputSchema, DeleteOneTopicApiInputSchema, DeleteOneTopicApiOutputSchema, } from "../../types/api/topic/index.js";
import { ApiError } from "../../errors/api-error.js";
export const topicRoutes = async (fastify) => {
    const topicService = fastify.container.services.topic;
    // GET /topics — list all non-deleted topics for the authenticated student
    fastify.get("/topics", async (request, reply) => {
        await fastify.authenticate(request, reply);
        const serviceOutput = await topicService.getMany({
            studentId: request.studentId,
        });
        const outputValidation = GetManyTopicApiOutputSchema.safeParse({
            topics: serviceOutput.map((topic) => ({
                ...topic,
                createdAt: topic.createdAt.toISOString(),
                updatedAt: topic.updatedAt.toISOString(),
            })),
        });
        if (!outputValidation.success) {
            throw ApiError.internal("Invalid service response", outputValidation.error);
        }
        return reply.send(outputValidation.data);
    });
    // POST /topics — create a new topic
    fastify.post("/topics", async (request, reply) => {
        await fastify.authenticate(request, reply);
        const inputValidation = CreateOneTopicApiInputSchema.safeParse(request.body);
        if (!inputValidation.success) {
            throw ApiError.validation("Invalid request body", inputValidation.error);
        }
        const serviceOutput = await topicService.createOne({
            studentId: request.studentId,
            ...inputValidation.data,
        });
        const outputValidation = CreateOneTopicApiOutputSchema.safeParse({
            ...serviceOutput,
            createdAt: serviceOutput.createdAt.toISOString(),
            updatedAt: serviceOutput.updatedAt.toISOString(),
        });
        if (!outputValidation.success) {
            throw ApiError.internal("Invalid service response", outputValidation.error);
        }
        return reply.status(201).send(outputValidation.data);
    });
    // GET /topics/:topicId — get one topic (ownership check in service)
    fastify.get("/topics/:topicId", async (request, reply) => {
        await fastify.authenticate(request, reply);
        const inputValidation = GetOneTopicApiInputSchema.safeParse(request.params);
        if (!inputValidation.success) {
            throw ApiError.validation("Invalid topicId", inputValidation.error);
        }
        const serviceOutput = await topicService.getOne({
            id: inputValidation.data.topicId,
            studentId: request.studentId,
        });
        const outputValidation = GetOneTopicApiOutputSchema.safeParse({
            ...serviceOutput,
            createdAt: serviceOutput.createdAt.toISOString(),
            updatedAt: serviceOutput.updatedAt.toISOString(),
        });
        if (!outputValidation.success) {
            throw ApiError.internal("Invalid service response", outputValidation.error);
        }
        return reply.send(outputValidation.data);
    });
    // PATCH /topics/:topicId — update a topic (ownership check in service)
    fastify.patch("/topics/:topicId", async (request, reply) => {
        await fastify.authenticate(request, reply);
        const paramsValidation = UpdateOneTopicApiParamsSchema.safeParse(request.params);
        if (!paramsValidation.success) {
            throw ApiError.validation("Invalid topicId", paramsValidation.error);
        }
        const bodyValidation = UpdateOneTopicApiBodySchema.safeParse(request.body);
        if (!bodyValidation.success) {
            throw ApiError.validation("Invalid request body", bodyValidation.error);
        }
        const serviceOutput = await topicService.updateOne({
            id: paramsValidation.data.topicId,
            studentId: request.studentId,
            ...bodyValidation.data,
        });
        const outputValidation = UpdateOneTopicApiOutputSchema.safeParse({
            ...serviceOutput,
            createdAt: serviceOutput.createdAt.toISOString(),
            updatedAt: serviceOutput.updatedAt.toISOString(),
        });
        if (!outputValidation.success) {
            throw ApiError.internal("Invalid service response", outputValidation.error);
        }
        return reply.send(outputValidation.data);
    });
    // DELETE /topics/:topicId — soft-delete (sets deletedAt)
    fastify.delete("/topics/:topicId", async (request, reply) => {
        await fastify.authenticate(request, reply);
        const inputValidation = DeleteOneTopicApiInputSchema.safeParse(request.params);
        if (!inputValidation.success) {
            throw ApiError.validation("Invalid topicId", inputValidation.error);
        }
        const serviceOutput = await topicService.deleteOne({
            id: inputValidation.data.topicId,
            studentId: request.studentId,
        });
        const outputValidation = DeleteOneTopicApiOutputSchema.safeParse(serviceOutput);
        if (!outputValidation.success) {
            throw ApiError.internal("Invalid service response", outputValidation.error);
        }
        return reply.send(outputValidation.data);
    });
};
