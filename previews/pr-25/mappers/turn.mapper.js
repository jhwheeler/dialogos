function turnFromDataSourceToService(input) {
    return {
        id: input.id,
        sessionId: input.sessionId,
        index: input.index,
        studentAudioKey: input.studentAudioKey,
        studentText: input.studentText,
        assistantText: input.assistantText,
        assistantPromptType: input.assistantPromptType,
        assistantDetectedIssue: input.assistantDetectedIssue,
        latencyMs: input.latencyMs,
        createdAt: input.createdAt,
    };
}
export class TurnMapper {
    static getOne = {
        output: {
            fromDataSourceToService: turnFromDataSourceToService,
        },
    };
    static getMany = {
        output: {
            fromDataSourceToService(input) {
                return input.map(turnFromDataSourceToService);
            },
        },
    };
    static createOne = {
        output: {
            fromDataSourceToService: turnFromDataSourceToService,
        },
    };
    static updateOne = {
        output: {
            fromDataSourceToService: turnFromDataSourceToService,
        },
    };
}
