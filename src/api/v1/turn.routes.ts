import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { TurnService } from "../../services/turn/turn.service.js";
import {
  PresignAudioTurnApiParamsSchema,
  PresignAudioTurnApiBodySchema,
  PresignAudioTurnApiOutputSchema,
  CreateOneTurnApiParamsSchema,
  CreateOneTurnApiBodySchema,
  CreateOneTurnApiOutputSchema,
  GetOneTurnApiParamsSchema,
  GetOneTurnApiOutputSchema,
  GetManyTurnApiParamsSchema,
  GetManyTurnApiOutputSchema,
} from "../../types/api/turn/index.js";

export const turnRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const turnService = fastify.container.services.turn as TurnService;

  // POST /sessions/:sessionId/turns/presign-audio — get presigned upload URL
  app.post(
    "/sessions/:sessionId/turns/presign-audio",
    {
      schema: {
        tags: ["Turns"],
        security: [{ bearerAuth: [] }],
        params: PresignAudioTurnApiParamsSchema,
        body: PresignAudioTurnApiBodySchema,
        response: { 200: PresignAudioTurnApiOutputSchema },
      },
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const serviceOutput = await turnService.presignAudio({
        sessionId: request.params.sessionId,
        studentId: request.studentId,
        originalName: request.body.originalName,
        mimeType: request.body.mimeType,
        sizeBytes: request.body.sizeBytes,
      });

      return reply.send(serviceOutput);
    },
  );

  // POST /sessions/:sessionId/turns — create a new turn
  app.post(
    "/sessions/:sessionId/turns",
    {
      schema: {
        tags: ["Turns"],
        security: [{ bearerAuth: [] }],
        params: CreateOneTurnApiParamsSchema,
        body: CreateOneTurnApiBodySchema,
        response: { 201: CreateOneTurnApiOutputSchema },
      },
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const serviceOutput = await turnService.createOne({
        sessionId: request.params.sessionId,
        studentId: request.studentId,
        studentAudioKey: request.body.studentAudioKey,
      });

      const output = CreateOneTurnApiOutputSchema.parse(serviceOutput);
      return reply.status(201).send(output);
    },
  );

  // GET /sessions/:sessionId/turns/:turnId — get single turn (for polling)
  app.get(
    "/sessions/:sessionId/turns/:turnId",
    {
      schema: {
        tags: ["Turns"],
        security: [{ bearerAuth: [] }],
        params: GetOneTurnApiParamsSchema,
        response: { 200: GetOneTurnApiOutputSchema },
      },
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const serviceOutput = await turnService.getOne({
        id: request.params.turnId,
        sessionId: request.params.sessionId,
        studentId: request.studentId,
      });

      const output = GetOneTurnApiOutputSchema.parse(serviceOutput);
      return reply.send(output);
    },
  );

  // GET /sessions/:sessionId/turns — list all turns for a session
  app.get(
    "/sessions/:sessionId/turns",
    {
      schema: {
        tags: ["Turns"],
        security: [{ bearerAuth: [] }],
        params: GetManyTurnApiParamsSchema,
        response: { 200: GetManyTurnApiOutputSchema },
      },
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const serviceOutput = await turnService.getMany({
        sessionId: request.params.sessionId,
        studentId: request.studentId,
      });

      const output = GetManyTurnApiOutputSchema.parse({ turns: serviceOutput });
      return reply.send(output);
    },
  );
};
