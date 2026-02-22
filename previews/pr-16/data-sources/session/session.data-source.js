export class SessionDataSource {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOne(input) {
        return this.prisma.session.findUnique({
            where: { id: input.id },
        });
    }
    async getMany(input) {
        return this.prisma.session.findMany({
            where: {
                topicId: input.topicId,
                studentId: input.studentId,
                deletedAt: null,
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async createOne(input) {
        return this.prisma.session.create({
            data: {
                studentId: input.studentId,
                topicId: input.topicId,
                sourceId: input.sourceId,
                triviumStage: input.triviumStage,
                status: input.status,
            },
        });
    }
    async updateOne(input) {
        return this.prisma.session.update({
            where: { id: input.id },
            data: {
                ...(input.status !== undefined && { status: input.status }),
                ...(input.startedAt !== undefined && { startedAt: input.startedAt }),
                ...(input.endedAt !== undefined && { endedAt: input.endedAt }),
            },
        });
    }
    async deleteOne(input) {
        return this.prisma.session.update({
            where: { id: input.id },
            data: { deletedAt: new Date() },
        });
    }
}
