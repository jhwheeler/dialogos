import { PrismaClient } from "@prisma/client";

let testClient: PrismaClient | undefined;

export function getTestPrismaClient(): PrismaClient {
  if (!testClient) {
    testClient = new PrismaClient();
  }
  return testClient;
}

export async function cleanupTestDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.sessionArtifact.deleteMany();
  await prisma.turn.deleteMany();
  await prisma.session.deleteMany();
  await prisma.source.deleteMany();
  await prisma.topicFile.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.student.deleteMany();
}

export async function disconnectTestPrisma(): Promise<void> {
  if (testClient) {
    await testClient.$disconnect();
    testClient = undefined;
  }
}
