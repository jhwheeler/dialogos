import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import type {
  CreateOneTurnServiceInput,
  CreateOneTurnServiceOutput,
  GetOneTurnServiceInput,
  GetOneTurnServiceOutput,
  GetManyTurnServiceInput,
  GetManyTurnServiceOutput,
  PresignAudioTurnServiceInput,
  PresignAudioTurnServiceOutput,
} from "../../types/service/turn/index.js";
import { NotFoundError } from "../../errors/not-found-error.js";
import { ConflictError } from "../../errors/conflict-error.js";
import { ApiError } from "../../errors/api-error.js";
import { TurnDataSource } from "../../data-sources/turn/turn.data-source.js";
import { SessionDataSource } from "../../data-sources/session/session.data-source.js";
import type { StorageProvider } from "../../lib/storage/storage.js";
import type { JobQueue } from "../../lib/queue/job-queue.js";
import { JobType } from "../../lib/queue/types.js";
import { TurnMapper } from "../../mappers/turn.mapper.js";

const MAX_INDEX_RETRIES = 3;

export class TurnService {
  public constructor(
    private readonly turnDataSource: TurnDataSource,
    private readonly sessionDataSource: SessionDataSource,
    private readonly storage: StorageProvider | null,
    private readonly jobQueue: JobQueue,
  ) {}

  private async verifySessionOwnership(
    sessionId: string,
    studentId: string,
  ): Promise<{ status: string }> {
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

  public async presignAudio(
    input: PresignAudioTurnServiceInput,
  ): Promise<PresignAudioTurnServiceOutput> {
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

    const uploadUrl = await this.storage.getPresignedUploadUrl(
      storageKey,
      input.mimeType,
      undefined,
      input.sizeBytes,
    );

    return { uploadUrl, storageKey };
  }

  public async createOne(input: CreateOneTurnServiceInput): Promise<CreateOneTurnServiceOutput> {
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

        // Best-effort: enqueue async transcription pipeline
        try {
          await this.jobQueue.enqueue({
            jobType: JobType.TRANSCRIBE_TURN,
            turnId: turn.id,
          });
        } catch (enqueueError) {
          console.error(
            "Failed to enqueue TRANSCRIBE_TURN job for turn %s:",
            turn.id,
            enqueueError,
          );
        }

        return TurnMapper.createOne.output.fromDataSourceToService(turn);
      } catch (error) {
        const isUniqueViolation =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!isUniqueViolation || attempt === MAX_INDEX_RETRIES - 1) {
          throw error;
        }
      }
    }

    throw new ConflictError("Unable to assign turn index due to concurrent requests");
  }

  public async getOne(input: GetOneTurnServiceInput): Promise<GetOneTurnServiceOutput> {
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

  public async getMany(input: GetManyTurnServiceInput): Promise<GetManyTurnServiceOutput> {
    await this.verifySessionOwnership(input.sessionId, input.studentId);

    const turns = await this.turnDataSource.getMany({
      sessionId: input.sessionId,
    });

    return TurnMapper.getMany.output.fromDataSourceToService(turns);
  }
}
