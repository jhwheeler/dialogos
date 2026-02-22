import { describe, it, expect, vi, beforeEach } from "vitest";
import { StudentService } from "../src/services/student/student.service.js";
import { StudentDataSource } from "../src/data-sources/student/student.data-source.js";
import { NotFoundError } from "../src/errors/not-found-error.js";
import type { GetOneStudentDataSourceOutput } from "../src/types/data-source/student/index.js";

type FullStudentRow = GetOneStudentDataSourceOutput;

function createMockDataSource() {
  return {
    getOne: vi.fn(),
    getOneByEmail: vi.fn(),
    createOne: vi.fn(),
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
  } as unknown as StudentDataSource;
}

function fakeStudent(overrides?: Partial<FullStudentRow>): FullStudentRow {
  return {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    email: "test@example.com",
    displayName: "Test Student",
    plan: "free",
    trialRemainingSeconds: 180,
    voiceRate: null,
    autoplay: null,
    strictness: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

describe("StudentService", () => {
  let service: StudentService;
  let ds: ReturnType<typeof createMockDataSource>;

  beforeEach(() => {
    ds = createMockDataSource();
    service = new StudentService(ds);
  });

  describe("getOne", () => {
    it("returns mapped student when found", async () => {
      const student = fakeStudent();
      (ds.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(student);

      const result = await service.getOne({ id: student.id });

      expect(ds.getOne).toHaveBeenCalledWith({ id: student.id });
      expect(result).toEqual({
        id: student.id,
        email: student.email,
        displayName: student.displayName,
        plan: student.plan,
        trialRemainingSeconds: student.trialRemainingSeconds,
        voiceRate: student.voiceRate,
        autoplay: student.autoplay,
        strictness: student.strictness,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      });
      expect(result).not.toHaveProperty("deletedAt");
    });

    it("throws NotFoundError when not found", async () => {
      (ds.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.getOne({ id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" })).rejects.toThrow(
        NotFoundError,
      );
    });

    it("throws NotFoundError when soft-deleted", async () => {
      const student = fakeStudent({ deletedAt: new Date("2025-06-01") });
      (ds.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(student);

      await expect(service.getOne({ id: student.id })).rejects.toThrow(NotFoundError);
    });
  });

  describe("createOrFind", () => {
    it("returns existing student with created: false", async () => {
      const student = fakeStudent();
      (ds.getOneByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(student);

      const result = await service.createOrFind({
        email: "test@example.com",
        displayName: "Test Student",
      });

      expect(result).toEqual({
        id: student.id,
        email: student.email,
        displayName: student.displayName,
        plan: student.plan,
        trialRemainingSeconds: student.trialRemainingSeconds,
        voiceRate: student.voiceRate,
        autoplay: student.autoplay,
        strictness: student.strictness,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
        created: false,
      });
      expect(ds.createOne).not.toHaveBeenCalled();
    });

    it("creates new student with created: true when not found", async () => {
      const student = fakeStudent();
      (ds.getOneByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (ds.createOne as ReturnType<typeof vi.fn>).mockResolvedValue(student);

      const result = await service.createOrFind({
        email: "test@example.com",
        displayName: "Test Student",
      });

      expect(result).toEqual({
        id: student.id,
        email: student.email,
        displayName: student.displayName,
        plan: student.plan,
        trialRemainingSeconds: student.trialRemainingSeconds,
        voiceRate: student.voiceRate,
        autoplay: student.autoplay,
        strictness: student.strictness,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
        created: true,
      });
    });

    it("calls getOneByEmail with the correct email", async () => {
      const student = fakeStudent();
      (ds.getOneByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(student);

      await service.createOrFind({
        email: "test@example.com",
        displayName: "Test Student",
      });

      expect(ds.getOneByEmail).toHaveBeenCalledWith({
        email: "test@example.com",
      });
    });

    it("calls createOne with email and displayName when not found", async () => {
      const student = fakeStudent();
      (ds.getOneByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (ds.createOne as ReturnType<typeof vi.fn>).mockResolvedValue(student);

      await service.createOrFind({
        email: "test@example.com",
        displayName: "Test Student",
      });

      expect(ds.createOne).toHaveBeenCalledWith({
        email: "test@example.com",
        displayName: "Test Student",
      });
    });
  });

  describe("updateOne", () => {
    it("updates and returns mapped result", async () => {
      const existing = fakeStudent();
      const updated = fakeStudent({
        displayName: "Updated Name",
        updatedAt: new Date("2025-06-01"),
      });
      (ds.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
      (ds.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      const result = await service.updateOne({
        id: existing.id,
        displayName: "Updated Name",
      });

      expect(ds.getOne).toHaveBeenCalledWith({ id: existing.id });
      expect(ds.updateOne).toHaveBeenCalledWith({
        id: existing.id,
        displayName: "Updated Name",
        voiceRate: undefined,
        autoplay: undefined,
        strictness: undefined,
      });
      expect(result).toEqual({
        id: updated.id,
        email: updated.email,
        displayName: "Updated Name",
        plan: updated.plan,
        trialRemainingSeconds: updated.trialRemainingSeconds,
        voiceRate: updated.voiceRate,
        autoplay: updated.autoplay,
        strictness: updated.strictness,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });
      expect(result).not.toHaveProperty("deletedAt");
    });

    it("throws NotFoundError if student does not exist", async () => {
      (ds.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.updateOne({
          id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          displayName: "New Name",
        }),
      ).rejects.toThrow(NotFoundError);

      expect(ds.updateOne).not.toHaveBeenCalled();
    });
  });

  describe("deleteOne", () => {
    it("deletes and returns { id }", async () => {
      const student = fakeStudent();
      const deletedStudent = fakeStudent({ deletedAt: new Date("2025-06-01") });
      (ds.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(student);
      (ds.deleteOne as ReturnType<typeof vi.fn>).mockResolvedValue(deletedStudent);

      const result = await service.deleteOne({ id: student.id });

      expect(ds.getOne).toHaveBeenCalledWith({ id: student.id });
      expect(ds.deleteOne).toHaveBeenCalledWith({ id: student.id });
      expect(result).toEqual({ id: student.id });
      expect(result).not.toHaveProperty("email");
      expect(result).not.toHaveProperty("displayName");
      expect(result).not.toHaveProperty("deletedAt");
    });

    it("throws NotFoundError if student does not exist", async () => {
      (ds.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.deleteOne({ id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }),
      ).rejects.toThrow(NotFoundError);

      expect(ds.deleteOne).not.toHaveBeenCalled();
    });
  });
});
