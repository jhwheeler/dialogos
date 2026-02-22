export class TurnDataSource {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOne(input) {
        return this.prisma.turn.findUnique({
            where: { id: input.id },
        });
    }
    async getMany(input) {
        return this.prisma.turn.findMany({
            where: { sessionId: input.sessionId },
            orderBy: { index: "asc" },
        });
    }
    async createOne(input) {
        return this.prisma.turn.create({
            data: {
                sessionId: input.sessionId,
                index: input.index,
                studentAudioKey: input.studentAudioKey,
            },
        });
    }
    async countBySession(input) {
        return this.prisma.turn.count({
            where: { sessionId: input.sessionId },
        });
    }
}
