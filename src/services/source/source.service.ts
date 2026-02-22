import type {
  GetOneSourceServiceInput,
  GetOneSourceServiceOutput,
  GetManySourceServiceInput,
  GetManySourceServiceOutput,
  CreateOneSourceServiceInput,
  CreateOneSourceServiceOutput,
  UpdateOneSourceServiceInput,
  UpdateOneSourceServiceOutput,
  DeleteOneSourceServiceInput,
  DeleteOneSourceServiceOutput,
} from "../../types/service/source/index.js";
import { NotFoundError } from "../../errors/not-found-error.js";
import { SourceDataSource } from "../../data-sources/source/source.data-source.js";
import { TopicDataSource } from "../../data-sources/topic/topic.data-source.js";
import { TopicFileDataSource } from "../../data-sources/topic-file/topic-file.data-source.js";
import { SourceMapper } from "../../mappers/source.mapper.js";

export class SourceService {
  public constructor(
    private readonly sourceDataSource: SourceDataSource,
    private readonly topicDataSource: TopicDataSource,
    private readonly topicFileDataSource: TopicFileDataSource,
  ) {}

  /**
   * Derive grounding tier based on sourceType and whether extractedText is available.
   *
   * Tier 1: extracted text available (any source type with text)
   * Tier 2: reference without extracted text (known/canonical source)
   * Tier 3: file-backed source without text yet, or voice summary
   */
  public static deriveGroundingTier(
    sourceType: "photo_ocr" | "document" | "reference" | "voice_summary",
    extractedText?: string,
  ): number {
    if (extractedText && extractedText.trim().length > 0) {
      return 1;
    }

    if (sourceType === "photo_ocr" || sourceType === "document") {
      // File-backed source without extracted text yet — still Tier 1 potential,
      // but until text is extracted, treat as Tier 3
      return 3;
    }

    if (sourceType === "reference") {
      // Known/canonical text without uploaded extract — Tier 2
      return 2;
    }

    // voice_summary or anything else without text — Tier 3
    return 3;
  }

  private async verifyTopicOwnership(topicId: string, studentId: string): Promise<void> {
    const topic = await this.topicDataSource.getOne({ id: topicId });

    if (!topic || topic.studentId !== studentId || topic.deletedAt !== null) {
      throw new NotFoundError("Topic not found");
    }
  }

  public async getOne(input: GetOneSourceServiceInput): Promise<GetOneSourceServiceOutput> {
    const source = await this.sourceDataSource.getOne({ id: input.id });

    if (!source) {
      throw new NotFoundError("Source not found");
    }

    if (source.deletedAt !== null) {
      throw new NotFoundError("Source not found");
    }

    // Verify ownership through topic
    await this.verifyTopicOwnership(source.topicId, input.studentId);

    return SourceMapper.getOne.output.fromDataSourceToService(source);
  }

  public async getMany(input: GetManySourceServiceInput): Promise<GetManySourceServiceOutput> {
    await this.verifyTopicOwnership(input.topicId, input.studentId);

    const sources = await this.sourceDataSource.getMany({
      topicId: input.topicId,
    });

    return SourceMapper.getMany.output.fromDataSourceToService(sources);
  }

  public async createOne(
    input: CreateOneSourceServiceInput,
  ): Promise<CreateOneSourceServiceOutput> {
    await this.verifyTopicOwnership(input.topicId, input.studentId);

    if (input.topicFileId) {
      const topicFile = await this.topicFileDataSource.getOne({ id: input.topicFileId });

      if (!topicFile || topicFile.deletedAt !== null || topicFile.topicId !== input.topicId) {
        throw new NotFoundError("Topic file not found");
      }
    }

    const groundingTier = SourceService.deriveGroundingTier(input.sourceType, input.extractedText);

    const source = await this.sourceDataSource.createOne({
      topicId: input.topicId,
      topicFileId: input.topicFileId,
      sourceType: input.sourceType,
      title: input.title,
      citation: input.citation,
      extractedText: input.extractedText,
      groundingTier,
    });

    return SourceMapper.createOne.output.fromDataSourceToService(source);
  }

  public async updateOne(
    input: UpdateOneSourceServiceInput,
  ): Promise<UpdateOneSourceServiceOutput> {
    const existing = await this.getOne({ id: input.id, studentId: input.studentId });

    // Recalculate grounding tier if extractedText changed
    let groundingTier: number | undefined;
    if (input.extractedText !== undefined) {
      groundingTier = SourceService.deriveGroundingTier(existing.sourceType, input.extractedText);
    }

    const source = await this.sourceDataSource.updateOne({
      id: input.id,
      title: input.title,
      citation: input.citation,
      extractedText: input.extractedText,
      groundingTier,
    });

    return SourceMapper.updateOne.output.fromDataSourceToService(source);
  }

  public async deleteOne(
    input: DeleteOneSourceServiceInput,
  ): Promise<DeleteOneSourceServiceOutput> {
    await this.getOne({ id: input.id, studentId: input.studentId });

    const source = await this.sourceDataSource.deleteOne({ id: input.id });

    return SourceMapper.deleteOne.output.fromDataSourceToService(source);
  }
}
