import { PresignAudioTurnApiParamsSchema, PresignAudioTurnApiBodySchema, PresignAudioTurnApiOutputSchema, CreateOneTurnApiParamsSchema, CreateOneTurnApiBodySchema, CreateOneTurnApiOutputSchema, GetOneTurnApiParamsSchema, GetOneTurnApiOutputSchema, GetManyTurnApiParamsSchema, GetManyTurnApiOutputSchema, } from "../../types/api/turn/index.js";
function formatTurnDates(turn) {
    return {
        createdAt: turn.createdAt.toISOString(),
    };
}
export const turnRoutes = async (fastify) => {
    const app = fastify.withTypeProvider();
    const turnService = fastify.container.services.turn;
    // POST /sessions/:sessionId/turns/presign-audio — get presigned upload URL
    app.post("/sessions/:sessionId/turns/presign-audio", {
        schema: {
            tags: ["Turns"],
            security: [{ bearerAuth: [] }],
            params: PresignAudioTurnApiParamsSchema,
            body: PresignAudioTurnApiBodySchema,
            response: { 200: PresignAudioTurnApiOutputSchema },
        },
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const serviceOutput = await turnService.presignAudio({
            sessionId: request.params.sessionId,
            studentId: request.studentId,
            originalName: request.body.originalName,
            mimeType: request.body.mimeType,
            sizeBytes: request.body.sizeBytes,
        });
        return reply.send(serviceOutput);
    });
    // POST /sessions/:sessionId/turns — create a new turn
    app.post("/sessions/:sessionId/turns", {
        schema: {
            tags: ["Turns"],
            security: [{ bearerAuth: [] }],
            params: CreateOneTurnApiParamsSchema,
            body: CreateOneTurnApiBodySchema,
            response: { 201: CreateOneTurnApiOutputSchema },
        },
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const serviceOutput = await turnService.createOne({
            sessionId: request.params.sessionId,
            studentId: request.studentId,
            studentAudioKey: request.body.studentAudioKey,
        });
        return reply.status(201).send({
            ...serviceOutput,
            ...formatTurnDates(serviceOutput),
        });
    });
    // GET /sessions/:sessionId/turns/:turnId — get single turn (for polling)
    app.get("/sessions/:sessionId/turns/:turnId", {
        schema: {
            tags: ["Turns"],
            security: [{ bearerAuth: [] }],
            params: GetOneTurnApiParamsSchema,
            response: { 200: GetOneTurnApiOutputSchema },
        },
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const serviceOutput = await turnService.getOne({
            id: request.params.turnId,
            studentId: request.studentId,
        });
        return reply.send({
            ...serviceOutput,
            ...formatTurnDates(serviceOutput),
        });
    });
    // GET /sessions/:sessionId/turns — list all turns for a session
    app.get("/sessions/:sessionId/turns", {
        schema: {
            tags: ["Turns"],
            security: [{ bearerAuth: [] }],
            params: GetManyTurnApiParamsSchema,
            response: { 200: GetManyTurnApiOutputSchema },
        },
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const serviceOutput = await turnService.getMany({
            sessionId: request.params.sessionId,
            studentId: request.studentId,
        });
        return reply.send({
            turns: serviceOutput.map((turn) => ({
                ...turn,
                ...formatTurnDates(turn),
            })),
        });
    });
};
