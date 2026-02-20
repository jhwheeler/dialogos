import type {
  GetOneTopicServiceInput,
  GetOneTopicServiceOutput,
  GetManyTopicServiceInput,
  GetManyTopicServiceOutput,
  CreateOneTopicServiceInput,
  CreateOneTopicServiceOutput,
  UpdateOneTopicServiceInput,
  UpdateOneTopicServiceOutput,
  DeleteOneTopicServiceInput,
  DeleteOneTopicServiceOutput,
} from "../../types/service/topic/index.js";
import { NotFoundError } from "../../errors/not-found-error.js";
import { TopicDataSource } from "../../data-sources/topic/topic.data-source.js";
import { TopicMapper } from "../../mappers/topic.mapper.js";

export class TopicService {
  public constructor(private readonly topicDataSource: TopicDataSource) {}

  public async getOne(input: GetOneTopicServiceInput): Promise<GetOneTopicServiceOutput> {
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

  public async getMany(input: GetManyTopicServiceInput): Promise<GetManyTopicServiceOutput> {
    const topics = await this.topicDataSource.getMany({
      studentId: input.studentId,
    });

    return TopicMapper.getMany.output.fromDataSourceToService(topics);
  }

  public async createOne(input: CreateOneTopicServiceInput): Promise<CreateOneTopicServiceOutput> {
    const topic = await this.topicDataSource.createOne({
      studentId: input.studentId,
      title: input.title,
      description: input.description,
    });

    return TopicMapper.createOne.output.fromDataSourceToService(topic);
  }

  public async updateOne(input: UpdateOneTopicServiceInput): Promise<UpdateOneTopicServiceOutput> {
    await this.getOne({ id: input.id, studentId: input.studentId });

    const topic = await this.topicDataSource.updateOne({
      id: input.id,
      title: input.title,
      description: input.description,
    });

    return TopicMapper.updateOne.output.fromDataSourceToService(topic);
  }

  public async deleteOne(input: DeleteOneTopicServiceInput): Promise<DeleteOneTopicServiceOutput> {
    await this.getOne({ id: input.id, studentId: input.studentId });

    const topic = await this.topicDataSource.deleteOne({ id: input.id });

    return TopicMapper.deleteOne.output.fromDataSourceToService(topic);
  }
}
