export class SourceDataSource {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOne(input) {
        return this.prisma.source.findUnique({
            where: { id: input.id },
        });
    }
    async getMany(input) {
        return this.prisma.source.findMany({
            where: {
                topicId: input.topicId,
                deletedAt: null,
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async createOne(input) {
        return this.prisma.source.create({
            data: {
                topicId: input.topicId,
                topicFileId: input.topicFileId,
                sourceType: input.sourceType,
                title: input.title,
                citation: input.citation,
                extractedText: input.extractedText,
                groundingTier: input.groundingTier,
            },
        });
    }
    async updateOne(input) {
        return this.prisma.source.update({
            where: { id: input.id },
            data: {
                ...(input.title !== undefined && { title: input.title }),
                ...(input.citation !== undefined && { citation: input.citation }),
                ...(input.extractedText !== undefined && { extractedText: input.extractedText }),
                ...(input.groundingTier !== undefined && { groundingTier: input.groundingTier }),
            },
        });
    }
    async deleteOne(input) {
        return this.prisma.source.update({
            where: { id: input.id },
            data: { deletedAt: new Date() },
        });
    }
}
