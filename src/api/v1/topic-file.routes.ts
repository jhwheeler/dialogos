import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
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

export const topicFileRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const topicFileService = fastify.container.services.topicFile as TopicFileService;

  // GET /topics/:topicId/files — list all non-deleted files for a topic
  app.get(
    "/topics/:topicId/files",
    {
      schema: {
        tags: ["Topic Files"],
        security: [{ bearerAuth: [] }],
        params: GetManyTopicFileApiInputSchema,
        response: { 200: GetManyTopicFileApiOutputSchema },
      },
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const serviceOutput = await topicFileService.getMany({
        topicId: request.params.topicId,
        studentId: request.studentId,
      });

      return reply.send({ items: serviceOutput, count: serviceOutput.length });
    },
  );

  // POST /topics/:topicId/files/presign — get a pre-signed upload URL
  app.post(
    "/topics/:topicId/files/presign",
    {
      schema: {
        tags: ["Topic Files"],
        security: [{ bearerAuth: [] }],
        params: PresignUploadTopicFileApiParamsSchema,
        body: PresignUploadTopicFileApiBodySchema,
        response: { 200: PresignUploadTopicFileApiOutputSchema },
      },
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const serviceOutput = await topicFileService.presignUpload({
        topicId: request.params.topicId,
        studentId: request.studentId,
        kind: request.body.kind,
        originalName: request.body.originalName,
        mimeType: request.body.mimeType,
        sizeBytes: request.body.sizeBytes,
      });

      return reply.send(serviceOutput);
    },
  );

  // POST /topics/:topicId/files — confirm file upload (create record)
  app.post(
    "/topics/:topicId/files",
    {
      schema: {
        tags: ["Topic Files"],
        security: [{ bearerAuth: [] }],
        params: CreateOneTopicFileApiParamsSchema,
        body: CreateOneTopicFileApiBodySchema,
        response: { 201: CreateOneTopicFileApiOutputSchema },
      },
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const serviceOutput = await topicFileService.createOne({
        topicId: request.params.topicId,
        studentId: request.studentId,
        storageKey: request.body.storageKey,
        kind: request.body.kind,
        originalName: request.body.originalName,
        mimeType: request.body.mimeType,
        sizeBytes: request.body.sizeBytes,
      });

      return reply.status(201).send(serviceOutput);
    },
  );

  // DELETE /topics/:topicId/files/:fileId — soft-delete a file
  app.delete(
    "/topics/:topicId/files/:fileId",
    {
      schema: {
        tags: ["Topic Files"],
        security: [{ bearerAuth: [] }],
        params: DeleteOneTopicFileApiInputSchema,
        response: { 200: DeleteOneTopicFileApiOutputSchema },
      },
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const serviceOutput = await topicFileService.deleteOne({
        id: request.params.fileId,
        studentId: request.studentId,
      });

      return reply.send(serviceOutput);
    },
  );
};
