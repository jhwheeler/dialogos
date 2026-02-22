import crypto from "node:crypto";
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
import { TurnMapper } from "../../mappers/turn.mapper.js";

export class TurnService {
  public constructor(
    private readonly turnDataSource: TurnDataSource,
    private readonly sessionDataSource: SessionDataSource,
    private readonly storage: StorageProvider | null,
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
      throw new ConflictError(
        `Cannot presign audio: session status is '${status}', expected 'active'`,
      );
    }

    if (!this.storage) {
      throw ApiError.internal("Storage provider is not configured");
    }

    const safeName = input.originalName.replace(/[/\\]/g, "_");
    const storageKey = `turns/${input.sessionId}/audio/${crypto.randomUUID()}/${safeName}`;

    const uploadUrl = await this.storage.getPresignedUploadUrl(storageKey, input.mimeType);

    return { uploadUrl, storageKey };
  }

  public async createOne(input: CreateOneTurnServiceInput): Promise<CreateOneTurnServiceOutput> {
    const { status } = await this.verifySessionOwnership(input.sessionId, input.studentId);

    if (status !== "active") {
      throw new ConflictError(
        `Cannot create turn: session status is '${status}', expected 'active'`,
      );
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

  public async getOne(input: GetOneTurnServiceInput): Promise<GetOneTurnServiceOutput> {
    const turn = await this.turnDataSource.getOne({ id: input.id });

    if (!turn) {
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
