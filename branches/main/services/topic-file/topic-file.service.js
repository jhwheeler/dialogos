import crypto from "node:crypto";
import { ApiError } from "../../errors/api-error.js";
import { NotFoundError } from "../../errors/not-found-error.js";
import { TopicFileMapper } from "../../mappers/topic-file.mapper.js";
export class TopicFileService {
    topicFileDataSource;
    topicDataSource;
    storage;
    constructor(topicFileDataSource, topicDataSource, storage) {
        this.topicFileDataSource = topicFileDataSource;
        this.topicDataSource = topicDataSource;
        this.storage = storage;
    }
    async verifyTopicOwnership(topicId, studentId) {
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
    async getMany(input) {
        await this.verifyTopicOwnership(input.topicId, input.studentId);
        const files = await this.topicFileDataSource.getMany({
            topicId: input.topicId,
        });
        return TopicFileMapper.getMany.output.fromDataSourceToService(files);
    }
    async presignUpload(input) {
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
        const uploadUrl = await this.storage.getPresignedUploadUrl(storageKey, input.mimeType, undefined, input.sizeBytes);
        return { uploadUrl, storageKey };
    }
    async createOne(input) {
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
    async deleteOne(input) {
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
