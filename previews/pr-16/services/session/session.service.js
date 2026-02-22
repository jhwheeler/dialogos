import { NotFoundError } from "../../errors/not-found-error.js";
import { ConflictError } from "../../errors/conflict-error.js";
import { SessionMapper } from "../../mappers/session.mapper.js";
export class SessionService {
    sessionDataSource;
    topicDataSource;
    constructor(sessionDataSource, topicDataSource) {
        this.sessionDataSource = sessionDataSource;
        this.topicDataSource = topicDataSource;
    }
    async verifyTopicOwnership(topicId, studentId) {
        const topic = await this.topicDataSource.getOne({ id: topicId });
        if (!topic || topic.studentId !== studentId || topic.deletedAt !== null) {
            throw new NotFoundError("Topic not found");
        }
    }
    async getOne(input) {
        const session = await this.sessionDataSource.getOne({ id: input.id });
        if (!session) {
            throw new NotFoundError("Session not found");
        }
        if (session.studentId !== input.studentId) {
            throw new NotFoundError("Session not found");
        }
        if (session.deletedAt !== null) {
            throw new NotFoundError("Session not found");
        }
        return SessionMapper.getOne.output.fromDataSourceToService(session);
    }
    async getMany(input) {
        await this.verifyTopicOwnership(input.topicId, input.studentId);
        const sessions = await this.sessionDataSource.getMany({
            topicId: input.topicId,
            studentId: input.studentId,
        });
        return SessionMapper.getMany.output.fromDataSourceToService(sessions);
    }
    async createOne(input) {
        await this.verifyTopicOwnership(input.topicId, input.studentId);
        const session = await this.sessionDataSource.createOne({
            studentId: input.studentId,
            topicId: input.topicId,
            sourceId: input.sourceId,
            triviumStage: input.triviumStage ?? "combined",
            status: "draft",
        });
        return SessionMapper.createOne.output.fromDataSourceToService(session);
    }
    async startOne(input) {
        const session = await this.getOne({ id: input.id, studentId: input.studentId });
        if (session.status !== "draft") {
            throw new ConflictError(`Cannot start session: current status is '${session.status}', expected 'draft'`);
        }
        const updated = await this.sessionDataSource.updateOne({
            id: input.id,
            status: "active",
            startedAt: new Date(),
        });
        return SessionMapper.startOne.output.fromDataSourceToService(updated);
    }
    async endOne(input) {
        const session = await this.getOne({ id: input.id, studentId: input.studentId });
        if (session.status !== "active") {
            throw new ConflictError(`Cannot end session: current status is '${session.status}', expected 'active'`);
        }
        const updated = await this.sessionDataSource.updateOne({
            id: input.id,
            status: "ended",
            endedAt: new Date(),
        });
        return SessionMapper.endOne.output.fromDataSourceToService(updated);
    }
    async abortOne(input) {
        const session = await this.getOne({ id: input.id, studentId: input.studentId });
        if (session.status !== "active") {
            throw new ConflictError(`Cannot abort session: current status is '${session.status}', expected 'active'`);
        }
        const updated = await this.sessionDataSource.updateOne({
            id: input.id,
            status: "aborted",
            endedAt: new Date(),
        });
        return SessionMapper.abortOne.output.fromDataSourceToService(updated);
    }
    async deleteOne(input) {
        await this.getOne({ id: input.id, studentId: input.studentId });
        const session = await this.sessionDataSource.deleteOne({ id: input.id });
        return SessionMapper.deleteOne.output.fromDataSourceToService(session);
    }
}
