import { NotFoundError } from "../../errors/not-found-error.js";
import { StudentMapper } from "../../mappers/student.mapper.js";
export class StudentService {
    studentDataSource;
    constructor(studentDataSource) {
        this.studentDataSource = studentDataSource;
    }
    async getOne(input) {
        const student = await this.studentDataSource.getOne({ id: input.id });
        if (!student || student.deletedAt) {
            throw new NotFoundError("Student not found");
        }
        return StudentMapper.getOne.output.fromDataSourceToService(student);
    }
    async createOrFind(input) {
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
    async ensureExists(input) {
        await this.studentDataSource.ensureExists(input);
    }
    async updateOne(input) {
        await this.getOne({ id: input.id });
        const updated = await this.studentDataSource.updateOne({
            id: input.id,
            displayName: input.displayName,
            settings: input.settings,
            plan: input.plan,
            trialRemainingSeconds: input.trialRemainingSeconds,
        });
        return StudentMapper.updateOne.output.fromDataSourceToService(updated);
    }
    async deleteOne(input) {
        await this.getOne({ id: input.id });
        const deleted = await this.studentDataSource.deleteOne({ id: input.id });
        return StudentMapper.deleteOne.output.fromDataSourceToService(deleted);
    }
}
