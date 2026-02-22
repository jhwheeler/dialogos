import type {
  GetOneSessionServiceInput,
  GetOneSessionServiceOutput,
  GetManySessionServiceInput,
  GetManySessionServiceOutput,
  CreateOneSessionServiceInput,
  CreateOneSessionServiceOutput,
  StartOneSessionServiceInput,
  StartOneSessionServiceOutput,
  EndOneSessionServiceInput,
  EndOneSessionServiceOutput,
  AbortOneSessionServiceInput,
  AbortOneSessionServiceOutput,
  DeleteOneSessionServiceInput,
  DeleteOneSessionServiceOutput,
} from "../../types/service/session/index.js";
import { NotFoundError } from "../../errors/not-found-error.js";
import { ConflictError } from "../../errors/conflict-error.js";
import { SessionDataSource } from "../../data-sources/session/session.data-source.js";
import { TopicDataSource } from "../../data-sources/topic/topic.data-source.js";
import { SessionMapper } from "../../mappers/session.mapper.js";

export class SessionService {
  public constructor(
    private readonly sessionDataSource: SessionDataSource,
    private readonly topicDataSource: TopicDataSource,
  ) {}

  private async verifyTopicOwnership(topicId: string, studentId: string): Promise<void> {
    const topic = await this.topicDataSource.getOne({ id: topicId });

    if (!topic || topic.studentId !== studentId || topic.deletedAt !== null) {
      throw new NotFoundError("Topic not found");
    }
  }

  public async getOne(input: GetOneSessionServiceInput): Promise<GetOneSessionServiceOutput> {
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

  public async getMany(input: GetManySessionServiceInput): Promise<GetManySessionServiceOutput> {
    await this.verifyTopicOwnership(input.topicId, input.studentId);

    const sessions = await this.sessionDataSource.getMany({
      topicId: input.topicId,
      studentId: input.studentId,
    });

    return SessionMapper.getMany.output.fromDataSourceToService(sessions);
  }

  public async createOne(
    input: CreateOneSessionServiceInput,
  ): Promise<CreateOneSessionServiceOutput> {
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

  public async startOne(input: StartOneSessionServiceInput): Promise<StartOneSessionServiceOutput> {
    const session = await this.getOne({ id: input.id, studentId: input.studentId });

    if (session.status !== "draft") {
      throw new ConflictError(
        `Cannot start session: current status is '${session.status}', expected 'draft'`,
      );
    }

    const updated = await this.sessionDataSource.updateOne({
      id: input.id,
      status: "active",
      startedAt: new Date(),
    });

    return SessionMapper.startOne.output.fromDataSourceToService(updated);
  }

  public async endOne(input: EndOneSessionServiceInput): Promise<EndOneSessionServiceOutput> {
    const session = await this.getOne({ id: input.id, studentId: input.studentId });

    if (session.status !== "active") {
      throw new ConflictError(
        `Cannot end session: current status is '${session.status}', expected 'active'`,
      );
    }

    const updated = await this.sessionDataSource.updateOne({
      id: input.id,
      status: "ended",
      endedAt: new Date(),
    });

    return SessionMapper.endOne.output.fromDataSourceToService(updated);
  }

  public async abortOne(input: AbortOneSessionServiceInput): Promise<AbortOneSessionServiceOutput> {
    const session = await this.getOne({ id: input.id, studentId: input.studentId });

    if (session.status !== "active") {
      throw new ConflictError(
        `Cannot abort session: current status is '${session.status}', expected 'active'`,
      );
    }

    const updated = await this.sessionDataSource.updateOne({
      id: input.id,
      status: "aborted",
      endedAt: new Date(),
    });

    return SessionMapper.abortOne.output.fromDataSourceToService(updated);
  }

  public async deleteOne(
    input: DeleteOneSessionServiceInput,
  ): Promise<DeleteOneSessionServiceOutput> {
    await this.getOne({ id: input.id, studentId: input.studentId });

    const session = await this.sessionDataSource.deleteOne({ id: input.id });

    return SessionMapper.deleteOne.output.fromDataSourceToService(session);
  }
}
