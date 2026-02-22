import type { PrismaClient } from "@prisma/client";
import type {
  GetOneTurnDataSourceInput,
  GetOneTurnDataSourceOutput,
  GetManyTurnDataSourceInput,
  GetManyTurnDataSourceOutput,
  CreateOneTurnDataSourceInput,
  CreateOneTurnDataSourceOutput,
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

  public async countBySession(input: CountBySessionTurnDataSourceInput): Promise<number> {
    return this.prisma.turn.count({
      where: { sessionId: input.sessionId },
    });
  }
}
