import { NotFoundError } from "../../errors/not-found-error.js";
import { SourceMapper } from "../../mappers/source.mapper.js";
export class SourceService {
    sourceDataSource;
    topicDataSource;
    constructor(sourceDataSource, topicDataSource) {
        this.sourceDataSource = sourceDataSource;
        this.topicDataSource = topicDataSource;
    }
    /**
     * Derive grounding tier based on sourceType and whether extractedText is available.
     *
     * Tier 1: extracted text available (photo_ocr, document with text)
     * Tier 2: known/canonical text, no upload (reference type)
     * Tier 3: obscure or no source text (voice_summary, or reference without text)
     */
    static deriveGroundingTier(sourceType, extractedText) {
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
    async verifyTopicOwnership(topicId, studentId) {
        const topic = await this.topicDataSource.getOne({ id: topicId });
        if (!topic || topic.studentId !== studentId || topic.deletedAt !== null) {
            throw new NotFoundError("Topic not found");
        }
    }
    async getOne(input) {
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
    async getMany(input) {
        await this.verifyTopicOwnership(input.topicId, input.studentId);
        const sources = await this.sourceDataSource.getMany({
            topicId: input.topicId,
        });
        return SourceMapper.getMany.output.fromDataSourceToService(sources);
    }
    async createOne(input) {
        await this.verifyTopicOwnership(input.topicId, input.studentId);
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
    async updateOne(input) {
        const existing = await this.getOne({ id: input.id, studentId: input.studentId });
        // Recalculate grounding tier if extractedText changed
        let groundingTier;
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
    async deleteOne(input) {
        await this.getOne({ id: input.id, studentId: input.studentId });
        const source = await this.sourceDataSource.deleteOne({ id: input.id });
        return SourceMapper.deleteOne.output.fromDataSourceToService(source);
    }
}
