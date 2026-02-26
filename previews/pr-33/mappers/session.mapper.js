function sessionFromDataSourceToService(input) {
    return {
        id: input.id,
        topicId: input.topicId,
        sourceId: input.sourceId,
        triviumStage: input.triviumStage,
        status: input.status,
        bookPhase: input.bookPhase,
        startedAt: input.startedAt?.toISOString() ?? null,
        endedAt: input.endedAt?.toISOString() ?? null,
        createdAt: input.createdAt.toISOString(),
    };
}
export class SessionMapper {
    static getOne = {
        output: {
            fromDataSourceToService: sessionFromDataSourceToService,
        },
    };
    static getMany = {
        output: {
            fromDataSourceToService(input) {
                return input.map(sessionFromDataSourceToService);
            },
        },
    };
    static createOne = {
        output: {
            fromDataSourceToService: sessionFromDataSourceToService,
        },
    };
    static startOne = {
        output: {
            fromDataSourceToService: sessionFromDataSourceToService,
        },
    };
    static endOne = {
        output: {
            fromDataSourceToService: sessionFromDataSourceToService,
        },
    };
    static abortOne = {
        output: {
            fromDataSourceToService: sessionFromDataSourceToService,
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
