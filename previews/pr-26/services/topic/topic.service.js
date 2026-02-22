import { NotFoundError } from "../../errors/not-found-error.js";
import { TopicMapper } from "../../mappers/topic.mapper.js";
export class TopicService {
    topicDataSource;
    constructor(topicDataSource) {
        this.topicDataSource = topicDataSource;
    }
    async getOne(input) {
        const topic = await this.topicDataSource.getOne({ id: input.id });
        if (!topic) {
            throw new NotFoundError("Topic not found");
        }
        if (topic.studentId !== input.studentId) {
            throw new NotFoundError("Topic not found");
        }
        if (topic.deletedAt !== null) {
            throw new NotFoundError("Topic not found");
        }
        return TopicMapper.getOne.output.fromDataSourceToService(topic);
    }
    async getMany(input) {
        const topics = await this.topicDataSource.getMany({
            studentId: input.studentId,
        });
        return TopicMapper.getMany.output.fromDataSourceToService(topics);
    }
    async createOne(input) {
        const topic = await this.topicDataSource.createOne({
            studentId: input.studentId,
            title: input.title,
            description: input.description,
        });
        return TopicMapper.createOne.output.fromDataSourceToService(topic);
    }
    async updateOne(input) {
        await this.getOne({ id: input.id, studentId: input.studentId });
        const topic = await this.topicDataSource.updateOne({
            id: input.id,
            title: input.title,
            description: input.description,
        });
        return TopicMapper.updateOne.output.fromDataSourceToService(topic);
    }
    async deleteOne(input) {
        await this.getOne({ id: input.id, studentId: input.studentId });
        const topic = await this.topicDataSource.deleteOne({ id: input.id });
        return TopicMapper.deleteOne.output.fromDataSourceToService(topic);
    }
}
