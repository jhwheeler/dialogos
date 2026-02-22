import type { PrismaClient } from "@prisma/client";
import type { AppEnv } from "./env.js";
import { S3Storage } from "./storage/index.js";
import type { StorageProvider } from "./storage/index.js";
import { InMemoryJobQueue } from "./queue/index.js";
import { JobType } from "./queue/types.js";
import type { JobQueue } from "./queue/job-queue.js";
import { StudentDataSource } from "../data-sources/student/student.data-source.js";
import { StudentService } from "../services/student/student.service.js";
import { TopicDataSource } from "../data-sources/topic/topic.data-source.js";
import { TopicService } from "../services/topic/topic.service.js";
import { TopicFileDataSource } from "../data-sources/topic-file/topic-file.data-source.js";
import { TopicFileService } from "../services/topic-file/topic-file.service.js";
import { SourceDataSource } from "../data-sources/source/source.data-source.js";
import { SourceService } from "../services/source/source.service.js";
import { SessionDataSource } from "../data-sources/session/session.data-source.js";
import { SessionService } from "../services/session/session.service.js";
import { TurnDataSource } from "../data-sources/turn/turn.data-source.js";
import { TurnService } from "../services/turn/turn.service.js";
import {
  createTranscribeTurnHandler,
  createGeneratePromptHandler,
  createRenderArtifactsHandler,
} from "../jobs/handlers/index.js";

export interface AppContainer {
  prisma: PrismaClient;
  env: AppEnv;
  dataSources: Record<string, unknown>;
  services: Record<string, unknown>;
  jobQueue: JobQueue;
}

export function createContainer(prisma: PrismaClient, env: AppEnv): AppContainer {
  // DataSources and Services are registered here as the feature slices are built.
  // Each agent adds its data source / service to this file.
  const studentDataSource = new StudentDataSource(prisma);
  const studentService = new StudentService(studentDataSource);

  const topicDataSource = new TopicDataSource(prisma);
  const topicService = new TopicService(topicDataSource);

  const dataSources: Record<string, unknown> = {};
  const services: Record<string, unknown> = {};

  dataSources.student = studentDataSource;
  services.student = studentService;

  dataSources.topic = topicDataSource;
  services.topic = topicService;

  let storage: StorageProvider | null = null;
  if (
    env.STORAGE_BUCKET &&
    env.STORAGE_REGION &&
    env.STORAGE_ACCESS_KEY &&
    env.STORAGE_SECRET_KEY
  ) {
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

  const sourceDataSource = new SourceDataSource(prisma);
  const sourceService = new SourceService(sourceDataSource, topicDataSource, topicFileDataSource);

  dataSources.source = sourceDataSource;
  services.source = sourceService;

  // ─── Job queue ────────────────────────────────────────────────
  const jobQueue = new InMemoryJobQueue({ maxRetries: 3 });

  const turnDataSource = new TurnDataSource(prisma);

  // Register handlers before starting the queue
  jobQueue.registerHandler(
    JobType.TRANSCRIBE_TURN,
    createTranscribeTurnHandler(turnDataSource, jobQueue),
  );
  jobQueue.registerHandler(JobType.GENERATE_PROMPT, createGeneratePromptHandler(turnDataSource));
  jobQueue.registerHandler(JobType.RENDER_ARTIFACTS, createRenderArtifactsHandler());

  jobQueue.start();

  // ─── Services that depend on the queue ────────────────────────
  const sessionDataSource = new SessionDataSource(prisma);
  const sessionService = new SessionService(
    sessionDataSource,
    topicDataSource,
    sourceDataSource,
    jobQueue,
  );

  dataSources.session = sessionDataSource;
  services.session = sessionService;

  const turnService = new TurnService(turnDataSource, sessionDataSource, storage, jobQueue);

  dataSources.turn = turnDataSource;
  services.turn = turnService;

  return {
    prisma,
    env,
    dataSources,
    services,
    jobQueue,
  };
}
