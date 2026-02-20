import type { FastifyPluginAsync } from "fastify";
import { TopicFileService } from "../../services/topic-file/topic-file.service.js";
import {
  GetManyTopicFileApiInputSchema,
  GetManyTopicFileApiOutputSchema,
  PresignUploadTopicFileApiParamsSchema,
  PresignUploadTopicFileApiBodySchema,
  PresignUploadTopicFileApiOutputSchema,
  CreateOneTopicFileApiParamsSchema,
  CreateOneTopicFileApiBodySchema,
  CreateOneTopicFileApiOutputSchema,
  DeleteOneTopicFileApiInputSchema,
  DeleteOneTopicFileApiOutputSchema,
} from "../../types/api/topic-file/index.js";
import { ApiError } from "../../errors/api-error.js";

export const topicFileRoutes: FastifyPluginAsync = async (fastify) => {
  const topicFileService = fastify.container.services.topicFile as TopicFileService;

  // GET /topics/:topicId/files — list all non-deleted files for a topic
  fastify.get("/topics/:topicId/files", async (request, reply) => {
    await fastify.authenticate(request, reply);

    const inputValidation = GetManyTopicFileApiInputSchema.safeParse(request.params);

    if (!inputValidation.success) {
      throw ApiError.validation("Invalid topicId", inputValidation.error);
    }

    const serviceOutput = await topicFileService.getMany({
      topicId: inputValidation.data.topicId,
      studentId: request.studentId,
    });

    const outputValidation = GetManyTopicFileApiOutputSchema.safeParse({
      files: serviceOutput.map((file) => ({
        ...file,
        createdAt: file.createdAt.toISOString(),
      })),
    });

    if (!outputValidation.success) {
      throw ApiError.internal("Invalid service response", outputValidation.error);
    }

    return reply.send(outputValidation.data);
  });

  // POST /topics/:topicId/files/presign — get a pre-signed upload URL
  fastify.post("/topics/:topicId/files/presign", async (request, reply) => {
    await fastify.authenticate(request, reply);

    const paramsValidation = PresignUploadTopicFileApiParamsSchema.safeParse(request.params);

    if (!paramsValidation.success) {
      throw ApiError.validation("Invalid topicId", paramsValidation.error);
    }

    const bodyValidation = PresignUploadTopicFileApiBodySchema.safeParse(request.body);

    if (!bodyValidation.success) {
      throw ApiError.validation("Invalid request body", bodyValidation.error);
    }

    const serviceOutput = await topicFileService.presignUpload({
      topicId: paramsValidation.data.topicId,
      studentId: request.studentId,
      kind: bodyValidation.data.kind,
      originalName: bodyValidation.data.originalName,
      mimeType: bodyValidation.data.mimeType,
      sizeBytes: bodyValidation.data.sizeBytes,
    });

    const outputValidation = PresignUploadTopicFileApiOutputSchema.safeParse(serviceOutput);

    if (!outputValidation.success) {
      throw ApiError.internal("Invalid service response", outputValidation.error);
    }

    return reply.send(outputValidation.data);
  });

  // POST /topics/:topicId/files — confirm file upload (create record)
  fastify.post("/topics/:topicId/files", async (request, reply) => {
    await fastify.authenticate(request, reply);

    const paramsValidation = CreateOneTopicFileApiParamsSchema.safeParse(request.params);

    if (!paramsValidation.success) {
      throw ApiError.validation("Invalid topicId", paramsValidation.error);
    }

    const bodyValidation = CreateOneTopicFileApiBodySchema.safeParse(request.body);

    if (!bodyValidation.success) {
      throw ApiError.validation("Invalid request body", bodyValidation.error);
    }

    const serviceOutput = await topicFileService.createOne({
      topicId: paramsValidation.data.topicId,
      studentId: request.studentId,
      storageKey: bodyValidation.data.storageKey,
      kind: bodyValidation.data.kind,
      originalName: bodyValidation.data.originalName,
      mimeType: bodyValidation.data.mimeType,
      sizeBytes: bodyValidation.data.sizeBytes,
    });

    const outputValidation = CreateOneTopicFileApiOutputSchema.safeParse({
      ...serviceOutput,
      createdAt: serviceOutput.createdAt.toISOString(),
    });

    if (!outputValidation.success) {
      throw ApiError.internal("Invalid service response", outputValidation.error);
    }

    return reply.status(201).send(outputValidation.data);
  });

  // DELETE /topics/:topicId/files/:fileId — soft-delete a file
  fastify.delete("/topics/:topicId/files/:fileId", async (request, reply) => {
    await fastify.authenticate(request, reply);

    const inputValidation = DeleteOneTopicFileApiInputSchema.safeParse(request.params);

    if (!inputValidation.success) {
      throw ApiError.validation("Invalid parameters", inputValidation.error);
    }

    const serviceOutput = await topicFileService.deleteOne({
      id: inputValidation.data.fileId,
      studentId: request.studentId,
    });

    const outputValidation = DeleteOneTopicFileApiOutputSchema.safeParse(serviceOutput);

    if (!outputValidation.success) {
      throw ApiError.internal("Invalid service response", outputValidation.error);
    }

    return reply.send(outputValidation.data);
  });
};
