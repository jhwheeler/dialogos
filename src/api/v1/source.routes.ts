import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { SourceService } from "../../services/source/source.service.js";
import {
  GetOneSourceApiParamsSchema,
  GetOneSourceApiOutputSchema,
  GetManySourceApiParamsSchema,
  GetManySourceApiOutputSchema,
  CreateOneSourceApiParamsSchema,
  CreateOneSourceApiBodySchema,
  CreateOneSourceApiOutputSchema,
  UpdateOneSourceApiParamsSchema,
  UpdateOneSourceApiBodySchema,
  UpdateOneSourceApiOutputSchema,
  DeleteOneSourceApiParamsSchema,
  DeleteOneSourceApiOutputSchema,
} from "../../types/api/source/index.js";

export const sourceRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const sourceService = fastify.container.services.source as SourceService;

  // GET /topics/:topicId/sources — list all non-deleted sources for topic
  app.get(
    "/topics/:topicId/sources",
    {
      schema: {
        tags: ["Sources"],
        security: [{ bearerAuth: [] }],
        params: GetManySourceApiParamsSchema,
        response: { 200: GetManySourceApiOutputSchema },
      },
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const serviceOutput = await sourceService.getMany({
        topicId: request.params.topicId,
        studentId: request.studentId,
      });

      const output = GetManySourceApiOutputSchema.parse({ sources: serviceOutput });
      return reply.send(output);
    },
  );

  // POST /topics/:topicId/sources — create a new source
  app.post(
    "/topics/:topicId/sources",
    {
      schema: {
        tags: ["Sources"],
        security: [{ bearerAuth: [] }],
        params: CreateOneSourceApiParamsSchema,
        body: CreateOneSourceApiBodySchema,
        response: { 201: CreateOneSourceApiOutputSchema },
      },
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const serviceOutput = await sourceService.createOne({
        topicId: request.params.topicId,
        studentId: request.studentId,
        ...request.body,
      });

      const output = CreateOneSourceApiOutputSchema.parse(serviceOutput);
      return reply.status(201).send(output);
    },
  );

  // GET /topics/:topicId/sources/:sourceId — get one source
  app.get(
    "/topics/:topicId/sources/:sourceId",
    {
      schema: {
        tags: ["Sources"],
        security: [{ bearerAuth: [] }],
        params: GetOneSourceApiParamsSchema,
        response: { 200: GetOneSourceApiOutputSchema },
      },
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const serviceOutput = await sourceService.getOne({
        id: request.params.sourceId,
        studentId: request.studentId,
      });

      const output = GetOneSourceApiOutputSchema.parse(serviceOutput);
      return reply.send(output);
    },
  );

  // PATCH /topics/:topicId/sources/:sourceId — update a source
  app.patch(
    "/topics/:topicId/sources/:sourceId",
    {
      schema: {
        tags: ["Sources"],
        security: [{ bearerAuth: [] }],
        params: UpdateOneSourceApiParamsSchema,
        body: UpdateOneSourceApiBodySchema,
        response: { 200: UpdateOneSourceApiOutputSchema },
      },
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const serviceOutput = await sourceService.updateOne({
        id: request.params.sourceId,
        studentId: request.studentId,
        ...request.body,
      });

      const output = UpdateOneSourceApiOutputSchema.parse(serviceOutput);
      return reply.send(output);
    },
  );

  // DELETE /topics/:topicId/sources/:sourceId — soft-delete
  app.delete(
    "/topics/:topicId/sources/:sourceId",
    {
      schema: {
        tags: ["Sources"],
        security: [{ bearerAuth: [] }],
        params: DeleteOneSourceApiParamsSchema,
        response: { 200: DeleteOneSourceApiOutputSchema },
      },
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const serviceOutput = await sourceService.deleteOne({
        id: request.params.sourceId,
        studentId: request.studentId,
      });

      return reply.send(serviceOutput);
    },
  );
};
