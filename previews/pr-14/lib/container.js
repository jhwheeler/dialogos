import { S3Storage } from "./storage/index.js";
import { StudentDataSource } from "../data-sources/student/student.data-source.js";
import { StudentService } from "../services/student/student.service.js";
import { TopicDataSource } from "../data-sources/topic/topic.data-source.js";
import { TopicService } from "../services/topic/topic.service.js";
import { TopicFileDataSource } from "../data-sources/topic-file/topic-file.data-source.js";
import { TopicFileService } from "../services/topic-file/topic-file.service.js";
export function createContainer(prisma, env) {
    // DataSources and Services are registered here as the feature slices are built.
    // Each agent adds its data source / service to this file.
    const studentDataSource = new StudentDataSource(prisma);
    const studentService = new StudentService(studentDataSource);
    const topicDataSource = new TopicDataSource(prisma);
    const topicService = new TopicService(topicDataSource);
    const dataSources = {};
    const services = {};
    dataSources.student = studentDataSource;
    services.student = studentService;
    dataSources.topic = topicDataSource;
    services.topic = topicService;
    let storage = null;
    if (env.STORAGE_BUCKET &&
        env.STORAGE_REGION &&
        env.STORAGE_ACCESS_KEY &&
        env.STORAGE_SECRET_KEY) {
        storage = new S3Storage({
            bucket: env.STORAGE_BUCKET,
            region: env.STORAGE_REGION,
            endpoint: env.STORAGE_ENDPOINT,
            accessKeyId: env.STORAGE_ACCESS_KEY,
            secretAccessKey: env.STORAGE_SECRET_KEY,
        });
    }
    const topicFileDataSource = new TopicFileDataSource(prisma);
    const topicFileService = new TopicFileService(topicFileDataSource, topicDataSource, storage);
    dataSources.topicFile = topicFileDataSource;
    services.topicFile = topicFileService;
    return {
        prisma,
        env,
        dataSources,
        services,
    };
}
