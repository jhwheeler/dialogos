import type { PrismaClient } from "@prisma/client";
import type {
  GetOneTurnDataSourceInput,
  GetOneTurnDataSourceOutput,
  GetManyTurnDataSourceInput,
  GetManyTurnDataSourceOutput,
  CreateOneTurnDataSourceInput,
  CreateOneTurnDataSourceOutput,
  UpdateOneTurnDataSourceInput,
  UpdateOneTurnDataSourceOutput,
  CountBySessionTurnDataSourceInput,
} from "../../types/data-source/turn/index.js";

export class TurnDataSource {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getOne(
    input: GetOneTurnDataSourceInput,
  ): Promise<GetOneTurnDataSourceOutput | null> {
    return this.prisma.turn.findUnique({
      where: { id: input.id },
    });
  }

  public async getMany(input: GetManyTurnDataSourceInput): Promise<GetManyTurnDataSourceOutput> {
    return this.prisma.turn.findMany({
      where: { sessionId: input.sessionId },
      orderBy: { index: "asc" },
    });
  }

  public async createOne(
    input: CreateOneTurnDataSourceInput,
  ): Promise<CreateOneTurnDataSourceOutput> {
    return this.prisma.turn.create({
      data: {
        sessionId: input.sessionId,
        index: input.index,
        studentAudioKey: input.studentAudioKey,
      },
    });
  }

  public async updateOne(
    input: UpdateOneTurnDataSourceInput,
  ): Promise<UpdateOneTurnDataSourceOutput> {
    const { id, ...fields } = input;

    // Build data object with only the fields that were explicitly provided
    const data: Record<string, unknown> = {};
    if ("studentText" in fields) data.studentText = fields.studentText;
    if ("assistantText" in fields) data.assistantText = fields.assistantText;
    if ("assistantPromptType" in fields) data.assistantPromptType = fields.assistantPromptType;
    if ("assistantDetectedIssue" in fields)
      data.assistantDetectedIssue = fields.assistantDetectedIssue;
    if ("latencyMs" in fields) data.latencyMs = fields.latencyMs;

    return this.prisma.turn.update({
      where: { id },
      data,
    });
  }

  public async countBySession(input: CountBySessionTurnDataSourceInput): Promise<number> {
    return this.prisma.turn.count({
      where: { sessionId: input.sessionId },
    });
  }
}
