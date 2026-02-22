import { GetOneSessionApiParamsSchema, GetOneSessionApiOutputSchema, GetManySessionApiParamsSchema, GetManySessionApiOutputSchema, CreateOneSessionApiParamsSchema, CreateOneSessionApiBodySchema, CreateOneSessionApiOutputSchema, SessionTransitionApiParamsSchema, SessionTransitionApiOutputSchema, DeleteOneSessionApiParamsSchema, DeleteOneSessionApiOutputSchema, } from "../../types/api/session/index.js";
function formatSessionDates(session) {
    return {
        startedAt: session.startedAt?.toISOString() ?? null,
        endedAt: session.endedAt?.toISOString() ?? null,
        createdAt: session.createdAt.toISOString(),
    };
}
export const sessionRoutes = async (fastify) => {
    const app = fastify.withTypeProvider();
    const sessionService = fastify.container.services.session;
    // GET /topics/:topicId/sessions — list sessions for topic
    app.get("/topics/:topicId/sessions", {
        schema: {
            tags: ["Sessions"],
            security: [{ bearerAuth: [] }],
            params: GetManySessionApiParamsSchema,
            response: { 200: GetManySessionApiOutputSchema },
        },
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const serviceOutput = await sessionService.getMany({
            topicId: request.params.topicId,
            studentId: request.studentId,
        });
        return reply.send({
            sessions: serviceOutput.map((session) => ({
                ...session,
                ...formatSessionDates(session),
            })),
        });
    });
    // POST /topics/:topicId/sessions — create a new draft session
    app.post("/topics/:topicId/sessions", {
        schema: {
            tags: ["Sessions"],
            security: [{ bearerAuth: [] }],
            params: CreateOneSessionApiParamsSchema,
            body: CreateOneSessionApiBodySchema,
            response: { 201: CreateOneSessionApiOutputSchema },
        },
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const serviceOutput = await sessionService.createOne({
            topicId: request.params.topicId,
            studentId: request.studentId,
            ...request.body,
        });
        return reply.status(201).send({
            ...serviceOutput,
            ...formatSessionDates(serviceOutput),
        });
    });
    // GET /sessions/:sessionId — get single session
    app.get("/sessions/:sessionId", {
        schema: {
            tags: ["Sessions"],
            security: [{ bearerAuth: [] }],
            params: GetOneSessionApiParamsSchema,
            response: { 200: GetOneSessionApiOutputSchema },
        },
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const serviceOutput = await sessionService.getOne({
            id: request.params.sessionId,
            studentId: request.studentId,
        });
        return reply.send({
            ...serviceOutput,
            ...formatSessionDates(serviceOutput),
        });
    });
    // POST /sessions/:sessionId/start — transition DRAFT → ACTIVE
    app.post("/sessions/:sessionId/start", {
        schema: {
            tags: ["Sessions"],
            security: [{ bearerAuth: [] }],
            params: SessionTransitionApiParamsSchema,
            response: { 200: SessionTransitionApiOutputSchema },
        },
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const serviceOutput = await sessionService.startOne({
            id: request.params.sessionId,
            studentId: request.studentId,
        });
        return reply.send({
            ...serviceOutput,
            ...formatSessionDates(serviceOutput),
        });
    });
    // POST /sessions/:sessionId/end — transition ACTIVE → ENDED
    app.post("/sessions/:sessionId/end", {
        schema: {
            tags: ["Sessions"],
            security: [{ bearerAuth: [] }],
            params: SessionTransitionApiParamsSchema,
            response: { 200: SessionTransitionApiOutputSchema },
        },
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const serviceOutput = await sessionService.endOne({
            id: request.params.sessionId,
            studentId: request.studentId,
        });
        return reply.send({
            ...serviceOutput,
            ...formatSessionDates(serviceOutput),
        });
    });
    // POST /sessions/:sessionId/abort — transition ACTIVE → ABORTED
    app.post("/sessions/:sessionId/abort", {
        schema: {
            tags: ["Sessions"],
            security: [{ bearerAuth: [] }],
            params: SessionTransitionApiParamsSchema,
            response: { 200: SessionTransitionApiOutputSchema },
        },
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const serviceOutput = await sessionService.abortOne({
            id: request.params.sessionId,
            studentId: request.studentId,
        });
        return reply.send({
            ...serviceOutput,
            ...formatSessionDates(serviceOutput),
        });
    });
    // DELETE /sessions/:sessionId — soft-delete
    app.delete("/sessions/:sessionId", {
        schema: {
            tags: ["Sessions"],
            security: [{ bearerAuth: [] }],
            params: DeleteOneSessionApiParamsSchema,
            response: { 200: DeleteOneSessionApiOutputSchema },
        },
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const serviceOutput = await sessionService.deleteOne({
            id: request.params.sessionId,
            studentId: request.studentId,
        });
        return reply.send(serviceOutput);
    });
};
