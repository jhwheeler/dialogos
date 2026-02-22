import crypto from "node:crypto";
import type {
  GetManyTopicFileServiceInput,
  GetManyTopicFileServiceOutput,
  PresignUploadTopicFileServiceInput,
  PresignUploadTopicFileServiceOutput,
  CreateOneTopicFileServiceInput,
  CreateOneTopicFileServiceOutput,
  DeleteOneTopicFileServiceInput,
  DeleteOneTopicFileServiceOutput,
} from "../../types/service/topic-file/index.js";
import { ApiError } from "../../errors/api-error.js";
import { NotFoundError } from "../../errors/not-found-error.js";
import { TopicFileDataSource } from "../../data-sources/topic-file/topic-file.data-source.js";
import { TopicDataSource } from "../../data-sources/topic/topic.data-source.js";
import type { StorageProvider } from "../../lib/storage/storage.js";
import { TopicFileMapper } from "../../mappers/topic-file.mapper.js";

export class TopicFileService {
  public constructor(
    private readonly topicFileDataSource: TopicFileDataSource,
    private readonly topicDataSource: TopicDataSource,
    private readonly storage: StorageProvider | null,
  ) {}

  private async verifyTopicOwnership(topicId: string, studentId: string): Promise<void> {
    const topic = await this.topicDataSource.getOne({ id: topicId });

    if (!topic) {
      throw new NotFoundError("Topic not found");
    }

    if (topic.studentId !== studentId) {
      throw new NotFoundError("Topic not found");
    }

    if (topic.deletedAt !== null) {
      throw new NotFoundError("Topic not found");
    }
  }

  public async getMany(
    input: GetManyTopicFileServiceInput,
  ): Promise<GetManyTopicFileServiceOutput> {
    await this.verifyTopicOwnership(input.topicId, input.studentId);

    const files = await this.topicFileDataSource.getMany({
      topicId: input.topicId,
    });

    return TopicFileMapper.getMany.output.fromDataSourceToService(files);
  }

  public async presignUpload(
    input: PresignUploadTopicFileServiceInput,
  ): Promise<PresignUploadTopicFileServiceOutput> {
    await this.verifyTopicOwnership(input.topicId, input.studentId);

    if (!this.storage) {
      throw ApiError.internal("Storage provider is not configured");
    }

    // Sanitize filename: strip path traversal, null bytes, control characters,
    // non-alphanumeric chars (except . _ -), and limit length
    const safeName = input.originalName
      .replace(/\.\./g, "_")
      .replace(/[/\\]/g, "_")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f\x7f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 255);
    const storageKey = `topics/${input.topicId}/files/${crypto.randomUUID()}/${safeName}`;

    const uploadUrl = await this.storage.getPresignedUploadUrl(
      storageKey,
      input.mimeType,
      undefined,
      input.sizeBytes,
    );

    return { uploadUrl, storageKey };
  }

  public async createOne(
    input: CreateOneTopicFileServiceInput,
  ): Promise<CreateOneTopicFileServiceOutput> {
    await this.verifyTopicOwnership(input.topicId, input.studentId);

    const file = await this.topicFileDataSource.createOne({
      topicId: input.topicId,
      kind: input.kind,
      storageKey: input.storageKey,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: BigInt(input.sizeBytes),
    });

    return TopicFileMapper.createOne.output.fromDataSourceToService(file);
  }

  public async deleteOne(
    input: DeleteOneTopicFileServiceInput,
  ): Promise<DeleteOneTopicFileServiceOutput> {
    const file = await this.topicFileDataSource.getOne({ id: input.id });

    if (!file) {
      throw new NotFoundError("File not found");
    }

    if (file.deletedAt !== null) {
      throw new NotFoundError("File not found");
    }

    await this.verifyTopicOwnership(file.topicId, input.studentId);

    const deletedFile = await this.topicFileDataSource.deleteOne({
      id: input.id,
    });

    return TopicFileMapper.deleteOne.output.fromDataSourceToService(deletedFile);
  }
}
