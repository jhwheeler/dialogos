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
                ...(input.bookPhase !== undefined && { bookPhase: input.bookPhase }),
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
                ...(input.bookPhase !== undefined && { bookPhase: input.bookPhase }),
            },
        });
    }
    /**
     * Atomically transition a session from expectedStatus to newStatus.
     * Returns the updated session, or null if the current status didn't match
     * (i.e. a concurrent transition already occurred).
     */
    async transitionStatus(input) {
        const result = await this.prisma.session.updateMany({
            where: { id: input.id, status: input.expectedStatus },
            data: {
                status: input.newStatus,
                ...(input.startedAt !== undefined && { startedAt: input.startedAt }),
                ...(input.endedAt !== undefined && { endedAt: input.endedAt }),
            },
        });
        if (result.count === 0) {
            return null;
        }
        return this.prisma.session.findUniqueOrThrow({ where: { id: input.id } });
    }
    async deleteOne(input) {
        return this.prisma.session.update({
            where: { id: input.id },
            data: { deletedAt: new Date() },
        });
    }
}
