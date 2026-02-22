import type {
  GetOneStudentServiceInput,
  GetOneStudentServiceOutput,
  CreateOrFindStudentServiceInput,
  CreateOrFindStudentServiceOutput,
  UpdateOneStudentServiceInput,
  UpdateOneStudentServiceOutput,
  DeleteOneStudentServiceInput,
  DeleteOneStudentServiceOutput,
} from "../../types/service/student/index.js";
import { NotFoundError } from "../../errors/not-found-error.js";
import { StudentDataSource } from "../../data-sources/student/student.data-source.js";
import { StudentMapper } from "../../mappers/student.mapper.js";

export class StudentService {
  public constructor(private readonly studentDataSource: StudentDataSource) {}

  public async getOne(input: GetOneStudentServiceInput): Promise<GetOneStudentServiceOutput> {
    const student = await this.studentDataSource.getOne({ id: input.id });

    if (!student || student.deletedAt) {
      throw new NotFoundError("Student not found");
    }

    return StudentMapper.getOne.output.fromDataSourceToService(student);
  }

  public async createOrFind(
    input: CreateOrFindStudentServiceInput,
  ): Promise<CreateOrFindStudentServiceOutput> {
    const existing = await this.studentDataSource.getOneByEmail({
      email: input.email,
    });

    if (existing) {
      return StudentMapper.createOrFind.output.fromDataSourceToService(existing, false);
    }

    const created = await this.studentDataSource.createOne({
      email: input.email,
      displayName: input.displayName,
    });

    return StudentMapper.createOrFind.output.fromDataSourceToService(created, true);
  }

  public async ensureExists(input: {
    id: string;
    email: string;
    displayName: string;
  }): Promise<void> {
    await this.studentDataSource.ensureExists(input);
  }

  public async updateOne(
    input: UpdateOneStudentServiceInput,
  ): Promise<UpdateOneStudentServiceOutput> {
    await this.getOne({ id: input.id });

    const updated = await this.studentDataSource.updateOne({
      id: input.id,
      displayName: input.displayName,
      voiceRate: input.voiceRate,
      autoplay: input.autoplay,
      strictness: input.strictness,
    });

    return StudentMapper.updateOne.output.fromDataSourceToService(updated);
  }

  public async deleteOne(
    input: DeleteOneStudentServiceInput,
  ): Promise<DeleteOneStudentServiceOutput> {
    await this.getOne({ id: input.id });

    const deleted = await this.studentDataSource.deleteOne({ id: input.id });

    return StudentMapper.deleteOne.output.fromDataSourceToService(deleted);
  }
}
