import type { GetOneStudentDataSourceOutput } from "../types/data-source/student/index.js";
import type {
  GetOneStudentServiceOutput,
  CreateOrFindStudentServiceOutput,
  UpdateOneStudentServiceOutput,
  DeleteOneStudentServiceOutput,
} from "../types/service/student/index.js";

export class StudentMapper {
  public static readonly getOne = {
    output: {
      fromDataSourceToService(input: GetOneStudentDataSourceOutput): GetOneStudentServiceOutput {
        return {
          id: input.id,
          email: input.email,
          displayName: input.displayName,
          plan: input.plan,
          trialRemainingSeconds: input.trialRemainingSeconds,
          voiceRate: input.voiceRate,
          autoplay: input.autoplay,
          strictness: input.strictness,
          createdAt: input.createdAt,
          updatedAt: input.updatedAt,
        };
      },
    },
  };

  public static readonly createOrFind = {
    output: {
      fromDataSourceToService(
        input: GetOneStudentDataSourceOutput,
        created: boolean,
      ): CreateOrFindStudentServiceOutput {
        return {
          id: input.id,
          email: input.email,
          displayName: input.displayName,
          plan: input.plan,
          trialRemainingSeconds: input.trialRemainingSeconds,
          voiceRate: input.voiceRate,
          autoplay: input.autoplay,
          strictness: input.strictness,
          createdAt: input.createdAt,
          updatedAt: input.updatedAt,
          created,
        };
      },
    },
  };

  public static readonly updateOne = {
    output: {
      fromDataSourceToService(input: GetOneStudentDataSourceOutput): UpdateOneStudentServiceOutput {
        return {
          id: input.id,
          email: input.email,
          displayName: input.displayName,
          plan: input.plan,
          trialRemainingSeconds: input.trialRemainingSeconds,
          voiceRate: input.voiceRate,
          autoplay: input.autoplay,
          strictness: input.strictness,
          createdAt: input.createdAt,
          updatedAt: input.updatedAt,
        };
      },
    },
  };

  public static readonly deleteOne = {
    output: {
      fromDataSourceToService(input: GetOneStudentDataSourceOutput): DeleteOneStudentServiceOutput {
        return {
          id: input.id,
        };
      },
    },
  };
}
