import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { NotFoundError } from "../../errors/not-found-error.js";
import { ConflictError } from "../../errors/conflict-error.js";
import { ApiError } from "../../errors/api-error.js";
import { JobType } from "../../lib/queue/types.js";
import { TurnMapper } from "../../mappers/turn.mapper.js";
const MAX_INDEX_RETRIES = 3;
export class TurnService {
    turnDataSource;
    sessionDataSource;
    storage;
    jobQueue;
    constructor(turnDataSource, sessionDataSource, storage, jobQueue) {
        this.turnDataSource = turnDataSource;
        this.sessionDataSource = sessionDataSource;
        this.storage = storage;
        this.jobQueue = jobQueue;
    }
    async verifySessionOwnership(sessionId, studentId) {
        const session = await this.sessionDataSource.getOne({ id: sessionId });
        if (!session) {
            throw new NotFoundError("Session not found");
        }
        if (session.studentId !== studentId) {
            throw new NotFoundError("Session not found");
        }
        if (session.deletedAt !== null) {
            throw new NotFoundError("Session not found");
        }
        return { status: session.status };
    }
    async presignAudio(input) {
        const { status } = await this.verifySessionOwnership(input.sessionId, input.studentId);
        if (status !== "active") {
            throw new ConflictError("Cannot presign audio: invalid session status");
        }
        if (!this.storage) {
            throw ApiError.internal("Storage provider is not configured");
        }
        const safeName = input.originalName
            .replace(/\.\./g, "_")
            .replace(/[/\\]/g, "_")
            // eslint-disable-next-line no-control-regex
            .replace(/[\x00-\x1f\x7f]/g, "")
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .slice(0, 255);
        const storageKey = `turns/${input.sessionId}/audio/${crypto.randomUUID()}/${safeName}`;
        const uploadUrl = await this.storage.getPresignedUploadUrl(storageKey, input.mimeType, undefined, input.sizeBytes);
        return { uploadUrl, storageKey };
    }
    async createOne(input) {
        const { status } = await this.verifySessionOwnership(input.sessionId, input.studentId);
        if (status !== "active") {
            throw new ConflictError("Cannot create turn: invalid session status");
        }
        for (let attempt = 0; attempt < MAX_INDEX_RETRIES; attempt++) {
            const index = await this.turnDataSource.countBySession({
                sessionId: input.sessionId,
            });
            try {
                const turn = await this.turnDataSource.createOne({
                    sessionId: input.sessionId,
                    index,
                    studentAudioKey: input.studentAudioKey,
                });
                // Fire-and-forget: enqueue async transcription pipeline
                await this.jobQueue.enqueue({
                    jobType: JobType.TRANSCRIBE_TURN,
                    turnId: turn.id,
                });
                return TurnMapper.createOne.output.fromDataSourceToService(turn);
            }
            catch (error) {
                const isUniqueViolation = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
                if (!isUniqueViolation || attempt === MAX_INDEX_RETRIES - 1) {
                    throw error;
                }
            }
        }
        throw new ConflictError("Unable to assign turn index due to concurrent requests");
    }
    async getOne(input) {
        const turn = await this.turnDataSource.getOne({ id: input.id });
        if (!turn) {
            throw new NotFoundError("Turn not found");
        }
        if (turn.sessionId !== input.sessionId) {
            throw new NotFoundError("Turn not found");
        }
        // Verify ownership via the parent session
        await this.verifySessionOwnership(turn.sessionId, input.studentId);
        return TurnMapper.getOne.output.fromDataSourceToService(turn);
    }
    async getMany(input) {
        await this.verifySessionOwnership(input.sessionId, input.studentId);
        const turns = await this.turnDataSource.getMany({
            sessionId: input.sessionId,
        });
        return TurnMapper.getMany.output.fromDataSourceToService(turns);
    }
}
