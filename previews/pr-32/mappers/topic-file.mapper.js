function topicFileFromDataSourceToService(input) {
    return {
        id: input.id,
        kind: input.kind,
        storageKey: input.storageKey,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: Number(input.sizeBytes),
        createdAt: input.createdAt.toISOString(),
    };
}
export class TopicFileMapper {
    static getMany = {
        output: {
            fromDataSourceToService(input) {
                return input.map(topicFileFromDataSourceToService);
            },
        },
    };
    static createOne = {
        output: {
            fromDataSourceToService(input) {
                return topicFileFromDataSourceToService(input);
            },
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
