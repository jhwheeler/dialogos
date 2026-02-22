export class StudentDataSource {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOne(input) {
        return this.prisma.student.findUnique({
            where: { id: input.id },
        });
    }
    async getOneByEmail(input) {
        return this.prisma.student.findFirst({
            where: {
                email: input.email,
                deletedAt: null,
            },
        });
    }
    async createOne(input) {
        return this.prisma.student.create({
            data: {
                email: input.email,
                displayName: input.displayName,
            },
        });
    }
    async updateOne(input) {
        return this.prisma.student.update({
            where: { id: input.id },
            data: {
                ...(input.displayName !== undefined && { displayName: input.displayName }),
                ...(input.voiceRate !== undefined && { voiceRate: input.voiceRate }),
                ...(input.autoplay !== undefined && { autoplay: input.autoplay }),
                ...(input.strictness !== undefined && { strictness: input.strictness }),
                ...(input.plan !== undefined && { plan: input.plan }),
                ...(input.trialRemainingSeconds !== undefined && {
                    trialRemainingSeconds: input.trialRemainingSeconds,
                }),
            },
        });
    }
    async ensureExists(input) {
        await this.prisma.student.upsert({
            where: { id: input.id },
            update: {},
            create: { id: input.id, email: input.email, displayName: input.displayName },
        });
    }
    async deleteOne(input) {
        return this.prisma.student.update({
            where: { id: input.id },
            data: {
                deletedAt: new Date(),
            },
        });
    }
}
