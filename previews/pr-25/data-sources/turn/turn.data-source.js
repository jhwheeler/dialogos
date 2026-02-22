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
    async updateOne(input) {
        const { id, ...fields } = input;
        // Build data object with only the fields that were explicitly provided
        const data = {};
        if ("studentText" in fields)
            data.studentText = fields.studentText;
        if ("assistantText" in fields)
            data.assistantText = fields.assistantText;
        if ("assistantPromptType" in fields)
            data.assistantPromptType = fields.assistantPromptType;
        if ("assistantDetectedIssue" in fields)
            data.assistantDetectedIssue = fields.assistantDetectedIssue;
        if ("latencyMs" in fields)
            data.latencyMs = fields.latencyMs;
        return this.prisma.turn.update({
            where: { id },
            data,
        });
    }
    async countBySession(input) {
        return this.prisma.turn.count({
            where: { sessionId: input.sessionId },
        });
    }
}
