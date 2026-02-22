import { describe, it, expect, vi, beforeEach } from "vitest";
import { TopicFileService } from "../src/services/topic-file/topic-file.service.js";
import { TopicFileDataSource } from "../src/data-sources/topic-file/topic-file.data-source.js";
import { TopicDataSource } from "../src/data-sources/topic/topic.data-source.js";
import { NotFoundError } from "../src/errors/not-found-error.js";
import { ApiError } from "../src/errors/api-error.js";
import type { GetOneTopicDataSourceOutput } from "../src/types/data-source/topic/index.js";
import type { GetOneTopicFileDataSourceOutput } from "../src/types/data-source/topic-file/index.js";
import type { StorageProvider } from "../src/lib/storage/storage.js";

function createMockTopicFileDataSource() {
  return {
    getOne: vi.fn(),
    getMany: vi.fn(),
    createOne: vi.fn(),
    deleteOne: vi.fn(),
  } as unknown as TopicFileDataSource;
}

function createMockTopicDataSource() {
  return {
    getOne: vi.fn(),
    getMany: vi.fn(),
    createOne: vi.fn(),
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
  } as unknown as TopicDataSource;
}

function createMockStorage(): StorageProvider {
  return {
    getPresignedUploadUrl: vi.fn().mockResolvedValue("https://s3.example.com/upload?signed=true"),
  } as unknown as StorageProvider;
}

function fakeTopic(overrides?: Partial<GetOneTopicDataSourceOutput>): GetOneTopicDataSourceOutput {
  return {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    studentId: "11111111-2222-3333-4444-555555555555",
    title: "Test Topic",
    description: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

function fakeFile(
  overrides?: Partial<GetOneTopicFileDataSourceOutput>,
): GetOneTopicFileDataSourceOutput {
  return {
    id: "ffffffff-1111-2222-3333-444444444444",
    topicId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    kind: "pdf",
    storageKey: "topics/aaa/files/bbb/notes.pdf",
    originalName: "notes.pdf",
    mimeType: "application/pdf",
    sizeBytes: BigInt(12345),
    createdAt: new Date("2025-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

describe("TopicFileService", () => {
  let service: TopicFileService;
  let fileDs: ReturnType<typeof createMockTopicFileDataSource>;
  let topicDs: ReturnType<typeof createMockTopicDataSource>;
  let storage: StorageProvider;

  beforeEach(() => {
    fileDs = createMockTopicFileDataSource();
    topicDs = createMockTopicDataSource();
    storage = createMockStorage();
    service = new TopicFileService(fileDs, topicDs, storage);
  });

  // ─── getMany ───────────────────────────────────────────────────

  describe("getMany", () => {
    it("returns mapped files when topic exists and is owned", async () => {
      const topic = fakeTopic();
      (topicDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(topic);

      const files = [fakeFile(), fakeFile({ id: "ffffffff-5555-6666-7777-888888888888" })];
      (fileDs.getMany as ReturnType<typeof vi.fn>).mockResolvedValue(files);

      const result = await service.getMany({
        topicId: topic.id,
        studentId: topic.studentId,
      });

      expect(topicDs.getOne).toHaveBeenCalledWith({ id: topic.id });
      expect(fileDs.getMany).toHaveBeenCalledWith({ topicId: topic.id });
      expect(result).toHaveLength(2);
      expect(result[0].sizeBytes).toBe(12345);
      expect(result[0]).not.toHaveProperty("topicId");
      expect(result[0]).not.toHaveProperty("deletedAt");
    });

    it("returns empty array when topic has no files", async () => {
      const topic = fakeTopic();
      (topicDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(topic);
      (fileDs.getMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.getMany({
        topicId: topic.id,
        studentId: topic.studentId,
      });

      expect(result).toEqual([]);
    });

    it("throws NotFoundError when topic does not exist", async () => {
      (topicDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.getMany({
          topicId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          studentId: "11111111-2222-3333-4444-555555555555",
        }),
      ).rejects.toThrow(NotFoundError);

      expect(fileDs.getMany).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when topic belongs to different student", async () => {
      const topic = fakeTopic();
      (topicDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(topic);

      await expect(
        service.getMany({
          topicId: topic.id,
          studentId: "99999999-8888-7777-6666-555555555555",
        }),
      ).rejects.toThrow(NotFoundError);

      expect(fileDs.getMany).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when topic is soft-deleted", async () => {
      const topic = fakeTopic({ deletedAt: new Date("2025-06-01") });
      (topicDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(topic);

      await expect(
        service.getMany({
          topicId: topic.id,
          studentId: topic.studentId,
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── presignUpload ─────────────────────────────────────────────

  describe("presignUpload", () => {
    it("returns uploadUrl and storageKey when storage is configured", async () => {
      const topic = fakeTopic();
      (topicDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(topic);

      const result = await service.presignUpload({
        topicId: topic.id,
        studentId: topic.studentId,
        kind: "pdf",
        originalName: "notes.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
      });

      expect(result.uploadUrl).toBe("https://s3.example.com/upload?signed=true");
      expect(result.storageKey).toMatch(/^topics\/.*\/files\/.*\/notes\.pdf$/);
      expect(storage.getPresignedUploadUrl).toHaveBeenCalledWith(
        expect.stringContaining("notes.pdf"),
        "application/pdf",
        undefined,
        100,
      );
    });

    it("sanitizes slashes and backslashes in originalName", async () => {
      const topic = fakeTopic();
      (topicDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(topic);

      const result = await service.presignUpload({
        topicId: topic.id,
        studentId: topic.studentId,
        kind: "pdf",
        originalName: "path/to\\file.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
      });

      expect(result.storageKey).toContain("path_to_file.pdf");
      expect(result.storageKey).not.toMatch(/[/\\][/\\]/);
    });

    it("throws ApiError when storage is not configured", async () => {
      const serviceNoStorage = new TopicFileService(fileDs, topicDs, null);
      const topic = fakeTopic();
      (topicDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(topic);

      await expect(
        serviceNoStorage.presignUpload({
          topicId: topic.id,
          studentId: topic.studentId,
          kind: "pdf",
          originalName: "test.pdf",
          mimeType: "application/pdf",
          sizeBytes: 100,
        }),
      ).rejects.toThrow(ApiError);
    });

    it("throws NotFoundError when topic does not exist", async () => {
      (topicDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.presignUpload({
          topicId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          studentId: "11111111-2222-3333-4444-555555555555",
          kind: "pdf",
          originalName: "test.pdf",
          mimeType: "application/pdf",
          sizeBytes: 100,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError when topic belongs to different student", async () => {
      const topic = fakeTopic();
      (topicDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(topic);

      await expect(
        service.presignUpload({
          topicId: topic.id,
          studentId: "99999999-8888-7777-6666-555555555555",
          kind: "pdf",
          originalName: "test.pdf",
          mimeType: "application/pdf",
          sizeBytes: 100,
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── createOne ─────────────────────────────────────────────────

  describe("createOne", () => {
    it("creates a file record and returns mapped result", async () => {
      const topic = fakeTopic();
      const file = fakeFile();
      (topicDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(topic);
      (fileDs.createOne as ReturnType<typeof vi.fn>).mockResolvedValue(file);

      const result = await service.createOne({
        topicId: topic.id,
        studentId: topic.studentId,
        storageKey: "topics/aaa/files/bbb/notes.pdf",
        kind: "pdf",
        originalName: "notes.pdf",
        mimeType: "application/pdf",
        sizeBytes: 12345,
      });

      expect(fileDs.createOne).toHaveBeenCalledWith({
        topicId: topic.id,
        kind: "pdf",
        storageKey: "topics/aaa/files/bbb/notes.pdf",
        originalName: "notes.pdf",
        mimeType: "application/pdf",
        sizeBytes: BigInt(12345),
      });
      expect(result.id).toBe(file.id);
      expect(result.sizeBytes).toBe(12345);
      expect(result).not.toHaveProperty("topicId");
      expect(result).not.toHaveProperty("deletedAt");
    });

    it("throws NotFoundError when topic does not exist", async () => {
      (topicDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.createOne({
          topicId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          studentId: "11111111-2222-3333-4444-555555555555",
          storageKey: "key",
          kind: "pdf",
          originalName: "test.pdf",
          mimeType: "application/pdf",
          sizeBytes: 100,
        }),
      ).rejects.toThrow(NotFoundError);

      expect(fileDs.createOne).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when topic belongs to different student", async () => {
      const topic = fakeTopic();
      (topicDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(topic);

      await expect(
        service.createOne({
          topicId: topic.id,
          studentId: "99999999-8888-7777-6666-555555555555",
          storageKey: "key",
          kind: "pdf",
          originalName: "test.pdf",
          mimeType: "application/pdf",
          sizeBytes: 100,
        }),
      ).rejects.toThrow(NotFoundError);

      expect(fileDs.createOne).not.toHaveBeenCalled();
    });
  });

  // ─── deleteOne ─────────────────────────────────────────────────

  describe("deleteOne", () => {
    it("deletes and returns { id }", async () => {
      const file = fakeFile();
      const topic = fakeTopic();
      const deletedFile = fakeFile({ deletedAt: new Date("2025-06-01") });
      (fileDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(file);
      (topicDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(topic);
      (fileDs.deleteOne as ReturnType<typeof vi.fn>).mockResolvedValue(deletedFile);

      const result = await service.deleteOne({
        id: file.id,
        studentId: topic.studentId,
      });

      expect(fileDs.getOne).toHaveBeenCalledWith({ id: file.id });
      expect(fileDs.deleteOne).toHaveBeenCalledWith({ id: file.id });
      expect(result).toEqual({ id: file.id });
      expect(result).not.toHaveProperty("storageKey");
      expect(result).not.toHaveProperty("deletedAt");
    });

    it("throws NotFoundError when file does not exist", async () => {
      (fileDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.deleteOne({
          id: "ffffffff-1111-2222-3333-444444444444",
          studentId: "11111111-2222-3333-4444-555555555555",
        }),
      ).rejects.toThrow(NotFoundError);

      expect(fileDs.deleteOne).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when file is already soft-deleted", async () => {
      const file = fakeFile({ deletedAt: new Date("2025-06-01") });
      (fileDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(file);

      await expect(
        service.deleteOne({
          id: file.id,
          studentId: "11111111-2222-3333-4444-555555555555",
        }),
      ).rejects.toThrow(NotFoundError);

      expect(fileDs.deleteOne).not.toHaveBeenCalled();
    });

    it("throws NotFoundError when file's topic belongs to different student", async () => {
      const file = fakeFile();
      const topic = fakeTopic();
      (fileDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(file);
      (topicDs.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(topic);

      await expect(
        service.deleteOne({
          id: file.id,
          studentId: "99999999-8888-7777-6666-555555555555",
        }),
      ).rejects.toThrow(NotFoundError);

      expect(fileDs.deleteOne).not.toHaveBeenCalled();
    });
  });
});
