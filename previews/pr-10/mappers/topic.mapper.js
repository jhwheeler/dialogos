function topicFromDataSourceToService(input) {
    return {
        id: input.id,
        title: input.title,
        description: input.description,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
    };
}
export class TopicMapper {
    static getOne = {
        output: {
            fromDataSourceToService: topicFromDataSourceToService,
        },
    };
    static getMany = {
        output: {
            fromDataSourceToService(input) {
                return input.map(topicFromDataSourceToService);
            },
        },
    };
    static createOne = {
        output: {
            fromDataSourceToService: topicFromDataSourceToService,
        },
    };
    static updateOne = {
        output: {
            fromDataSourceToService: topicFromDataSourceToService,
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
