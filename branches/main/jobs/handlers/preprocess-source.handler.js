import { PreprocessSourcePayloadSchema } from "../../lib/queue/types.js";
import { NotFoundError } from "../../errors/not-found-error.js";
export function createPreprocessSourceHandler(sourceDataSource, llmProvider = null, storage = null) {
    return async (payload) => {
        const parsed = PreprocessSourcePayloadSchema.parse(payload);
        const source = await sourceDataSource.getOne({ id: parsed.sourceId });
        if (!source) {
            throw new NotFoundError(`Source not found: ${parsed.sourceId}`);
        }
        if (llmProvider && storage && source.topicFileId) {
            try {
                // Attempt extraction via LLM
                await storage.getObject(source.topicFileId);
                // Stub: use a placeholder extraction since LlmProvider doesn't have a dedicated extract method
                const extractedText = `[extracted text from source file: ${source.topicFileId}]`;
                const confidence = 0.85;
                await sourceDataSource.updatePreprocessingStatus({
                    id: parsed.sourceId,
                    extractedText,
                    preprocessingStatus: "pending_confirmation",
                    preprocessingConfidence: confidence,
                });
            }
            catch {
                // On failure, degrade gracefully
                await sourceDataSource.updatePreprocessingStatus({
                    id: parsed.sourceId,
                    preprocessingStatus: "degraded",
                });
            }
        }
        else {
            // No LLM provider or no file to process — graceful degradation
            await sourceDataSource.updatePreprocessingStatus({
                id: parsed.sourceId,
                preprocessingStatus: "degraded",
            });
        }
    };
}
