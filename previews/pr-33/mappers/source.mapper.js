function sourceFromDataSourceToService(input) {
    return {
        id: input.id,
        topicId: input.topicId,
        topicFileId: input.topicFileId,
        sourceType: input.sourceType,
        title: input.title,
        citation: input.citation,
        extractedText: input.extractedText,
        groundingTier: input.groundingTier,
        preprocessingStatus: input.preprocessingStatus,
        preprocessingConfidence: input.preprocessingConfidence,
        createdAt: input.createdAt.toISOString(),
    };
}
export class SourceMapper {
    static getOne = {
        output: {
            fromDataSourceToService: sourceFromDataSourceToService,
        },
    };
    static getMany = {
        output: {
            fromDataSourceToService(input) {
                return input.map(sourceFromDataSourceToService);
            },
        },
    };
    static createOne = {
        output: {
            fromDataSourceToService: sourceFromDataSourceToService,
        },
    };
    static updateOne = {
        output: {
            fromDataSourceToService: sourceFromDataSourceToService,
        },
    };
    static deleteOne = {
        output: {
            fromDataSourceToService(input) {
                return {
                    id: input.id,
                };
            },
        },
    };
}
