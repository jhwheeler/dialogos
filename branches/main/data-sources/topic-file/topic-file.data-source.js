export class TopicFileDataSource {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOne(input) {
        return this.prisma.topicFile.findUnique({
            where: { id: input.id },
        });
    }
    async getMany(input) {
        return this.prisma.topicFile.findMany({
            where: {
                topicId: input.topicId,
                deletedAt: null,
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async createOne(input) {
        return this.prisma.topicFile.create({
            data: {
                topicId: input.topicId,
                kind: input.kind,
                storageKey: input.storageKey,
                originalName: input.originalName,
                mimeType: input.mimeType,
                sizeBytes: input.sizeBytes,
            },
        });
    }
    async deleteOne(input) {
        return this.prisma.topicFile.update({
            where: { id: input.id },
            data: { deletedAt: new Date() },
        });
    }
}
