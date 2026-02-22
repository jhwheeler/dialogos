export class StudentMapper {
    static getOne = {
        output: {
            fromDataSourceToService(input) {
                return {
                    id: input.id,
                    email: input.email,
                    displayName: input.displayName,
                    plan: input.plan,
                    trialRemainingSeconds: input.trialRemainingSeconds,
                    settings: (input.settings ?? {}),
                    createdAt: input.createdAt,
                    updatedAt: input.updatedAt,
                };
            },
        },
    };
    static createOrFind = {
        output: {
            fromDataSourceToService(input, created) {
                return {
                    id: input.id,
                    email: input.email,
                    displayName: input.displayName,
                    plan: input.plan,
                    trialRemainingSeconds: input.trialRemainingSeconds,
                    settings: (input.settings ?? {}),
                    createdAt: input.createdAt,
                    updatedAt: input.updatedAt,
                    created,
                };
            },
        },
    };
    static updateOne = {
        output: {
            fromDataSourceToService(input) {
                return {
                    id: input.id,
                    email: input.email,
                    displayName: input.displayName,
                    plan: input.plan,
                    trialRemainingSeconds: input.trialRemainingSeconds,
                    settings: (input.settings ?? {}),
                    createdAt: input.createdAt,
                    updatedAt: input.updatedAt,
                };
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
