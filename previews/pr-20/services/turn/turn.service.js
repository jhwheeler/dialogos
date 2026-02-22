import crypto from "node:crypto";
import { NotFoundError } from "../../errors/not-found-error.js";
import { ConflictError } from "../../errors/conflict-error.js";
import { ApiError } from "../../errors/api-error.js";
import { TurnMapper } from "../../mappers/turn.mapper.js";
export class TurnService {
    turnDataSource;
    sessionDataSource;
    storage;
    constructor(turnDataSource, sessionDataSource, storage) {
        this.turnDataSource = turnDataSource;
        this.sessionDataSource = sessionDataSource;
        this.storage = storage;
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
            throw new ConflictError(`Cannot presign audio: session status is '${status}', expected 'active'`);
        }
        if (!this.storage) {
            throw ApiError.internal("Storage provider is not configured");
        }
        const safeName = input.originalName.replace(/[/\\]/g, "_");
        const storageKey = `turns/${input.sessionId}/audio/${crypto.randomUUID()}/${safeName}`;
        const uploadUrl = await this.storage.getPresignedUploadUrl(storageKey, input.mimeType);
        return { uploadUrl, storageKey };
    }
    async createOne(input) {
        const { status } = await this.verifySessionOwnership(input.sessionId, input.studentId);
        if (status !== "active") {
            throw new ConflictError(`Cannot create turn: session status is '${status}', expected 'active'`);
        }
        const index = await this.turnDataSource.countBySession({
            sessionId: input.sessionId,
        });
        const turn = await this.turnDataSource.createOne({
            sessionId: input.sessionId,
            index,
            studentAudioKey: input.studentAudioKey,
        });
        return TurnMapper.createOne.output.fromDataSourceToService(turn);
    }
    async getOne(input) {
        const turn = await this.turnDataSource.getOne({ id: input.id });
        if (!turn) {
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
