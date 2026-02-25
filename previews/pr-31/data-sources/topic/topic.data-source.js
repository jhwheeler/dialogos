export class TopicDataSource {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOne(input) {
        return this.prisma.topic.findUnique({
            where: { id: input.id },
        });
    }
    async getMany(input) {
        return this.prisma.topic.findMany({
            where: {
                studentId: input.studentId,
                deletedAt: null,
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async createOne(input) {
        return this.prisma.topic.create({
            data: {
                studentId: input.studentId,
                title: input.title,
                description: input.description,
            },
        });
    }
    async updateOne(input) {
        return this.prisma.topic.update({
            where: { id: input.id },
            data: {
                ...(input.title !== undefined && { title: input.title }),
                ...(input.description !== undefined && {
                    description: input.description,
                }),
            },
        });
    }
    async deleteOne(input) {
        return this.prisma.topic.update({
            where: { id: input.id },
            data: { deletedAt: new Date() },
        });
    }
}
