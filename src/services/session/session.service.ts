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
  TransitionBookPhaseSessionServiceInput,
  TransitionBookPhaseSessionServiceOutput,
} from "../../types/service/session/index.js";
import { NotFoundError } from "../../errors/not-found-error.js";
import { ConflictError } from "../../errors/conflict-error.js";
import { SessionDataSource } from "../../data-sources/session/session.data-source.js";
import { TopicDataSource } from "../../data-sources/topic/topic.data-source.js";
import { SourceDataSource } from "../../data-sources/source/source.data-source.js";
import type { JobQueue } from "../../lib/queue/job-queue.js";
import { JobType } from "../../lib/queue/types.js";
import { SessionMapper } from "../../mappers/session.mapper.js";

export class SessionService {
  public constructor(
    private readonly sessionDataSource: SessionDataSource,
    private readonly topicDataSource: TopicDataSource,
    private readonly sourceDataSource: SourceDataSource,
    private readonly jobQueue: JobQueue,
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

    // Verify the parent topic still exists and belongs to this student
    await this.verifyTopicOwnership(session.topicId, input.studentId);

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

    if (input.sourceId) {
      const source = await this.sourceDataSource.getOne({ id: input.sourceId });

      if (!source || source.deletedAt !== null || source.topicId !== input.topicId) {
        throw new NotFoundError("Source not found");
      }
    }

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
    // Verify ownership and existence
    await this.getOne({ id: input.id, studentId: input.studentId });

    // Atomic transition: only succeeds if current status is 'draft'
    const updated = await this.sessionDataSource.transitionStatus({
      id: input.id,
      expectedStatus: "draft",
      newStatus: "active",
      startedAt: new Date(),
    });

    if (!updated) {
      throw new ConflictError("Cannot start session: invalid current status");
    }

    // Combined sessions start in closed_recall book phase
    if (updated.triviumStage === "combined") {
      const withPhase = await this.sessionDataSource.updateOne({
        id: input.id,
        bookPhase: "closed_recall",
      });
      return SessionMapper.startOne.output.fromDataSourceToService(withPhase);
    }

    return SessionMapper.startOne.output.fromDataSourceToService(updated);
  }

  public async endOne(input: EndOneSessionServiceInput): Promise<EndOneSessionServiceOutput> {
    await this.getOne({ id: input.id, studentId: input.studentId });

    const updated = await this.sessionDataSource.transitionStatus({
      id: input.id,
      expectedStatus: "active",
      newStatus: "ended",
      endedAt: new Date(),
    });

    if (!updated) {
      throw new ConflictError("Cannot end session: invalid current status");
    }

    // Best-effort: enqueue artifact generation for the ended session
    try {
      await this.jobQueue.enqueue({
        jobType: JobType.RENDER_ARTIFACTS,
        sessionId: input.id,
      });
    } catch (error) {
      console.error("Failed to enqueue RENDER_ARTIFACTS job for session %s:", input.id, error);
    }

    return SessionMapper.endOne.output.fromDataSourceToService(updated);
  }

  public async abortOne(input: AbortOneSessionServiceInput): Promise<AbortOneSessionServiceOutput> {
    await this.getOne({ id: input.id, studentId: input.studentId });

    const updated = await this.sessionDataSource.transitionStatus({
      id: input.id,
      expectedStatus: "active",
      newStatus: "aborted",
      endedAt: new Date(),
    });

    if (!updated) {
      throw new ConflictError("Cannot abort session: invalid current status");
    }

    return SessionMapper.abortOne.output.fromDataSourceToService(updated);
  }

  public async transitionBookPhase(
    input: TransitionBookPhaseSessionServiceInput,
  ): Promise<TransitionBookPhaseSessionServiceOutput> {
    const session = await this.getOne({ id: input.id, studentId: input.studentId });

    // Only Combined sessions have book phases
    if (session.triviumStage !== "combined") {
      throw new ConflictError("Book phase transitions only apply to Combined sessions");
    }

    // Enforce forward-only transitions
    const phaseOrder = ["closed_recall", "open_text", "final_compression"];
    const currentIndex = session.bookPhase ? phaseOrder.indexOf(session.bookPhase) : -1;
    const targetIndex = phaseOrder.indexOf(input.targetPhase);

    if (targetIndex <= currentIndex) {
      throw new ConflictError("Book phase can only transition forward");
    }

    // Must be exactly one step forward
    if (targetIndex !== currentIndex + 1) {
      throw new ConflictError("Book phase must transition to the next phase in sequence");
    }

    const updated = await this.sessionDataSource.updateOne({
      id: input.id,
      bookPhase: input.targetPhase,
    });

    return SessionMapper.getOne.output.fromDataSourceToService(updated);
  }

  public async deleteOne(
    input: DeleteOneSessionServiceInput,
  ): Promise<DeleteOneSessionServiceOutput> {
    await this.getOne({ id: input.id, studentId: input.studentId });

    const session = await this.sessionDataSource.deleteOne({ id: input.id });

    return SessionMapper.deleteOne.output.fromDataSourceToService(session);
  }
}
