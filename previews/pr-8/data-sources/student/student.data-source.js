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
                displayName: input.displayName,
                settings: input.settings,
                plan: input.plan,
                trialRemainingSeconds: input.trialRemainingSeconds,
            },
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
