import { describe, it, expect, vi, beforeEach } from "vitest";
import { TopicService } from "../src/services/topic/topic.service.js";
import { TopicDataSource } from "../src/data-sources/topic/topic.data-source.js";
import { NotFoundError } from "../src/errors/not-found-error.js";
import type { GetOneTopicDataSourceOutput } from "../src/types/data-source/topic/index.js";

type FullTopicRow = GetOneTopicDataSourceOutput;

function createMockDataSource() {
  return {
    getOne: vi.fn(),
    getMany: vi.fn(),
    createOne: vi.fn(),
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
  } as unknown as TopicDataSource;
}

function fakeTopic(overrides?: Partial<FullTopicRow>): FullTopicRow {
  return {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    studentId: "11111111-2222-3333-4444-555555555555",
    title: "Test Topic",
    description: "A test description",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

describe("TopicService", () => {
  let service: TopicService;
  let ds: ReturnType<typeof createMockDataSource>;

  beforeEach(() => {
    ds = createMockDataSource();
    service = new TopicService(ds);
  });

  // ─── getOne ────────────────────────────────────────────────────

  describe("getOne", () => {
    it("returns mapped topic when found and owned by student", async () => {
      const topic = fakeTopic();
      (ds.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(topic);

      const result = await service.getOne({
        id: topic.id,
        studentId: topic.studentId,
      });

      expect(ds.getOne).toHaveBeenCalledWith({ id: topic.id });
      expect(result).toEqual({
        id: topic.id,
        title: topic.title,
        description: topic.description,
        createdAt: topic.createdAt.toISOString(),
        updatedAt: topic.updatedAt.toISOString(),
      });
      expect(result).not.toHaveProperty("studentId");
      expect(result).not.toHaveProperty("deletedAt");
    });

    it("throws NotFoundError when topic does not exist", async () => {
      (ds.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.getOne({
          id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          studentId: "11111111-2222-3333-4444-555555555555",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError when topic belongs to different student", async () => {
      const topic = fakeTopic();
      (ds.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(topic);

      await expect(
        service.getOne({
          id: topic.id,
          studentId: "99999999-8888-7777-6666-555555555555",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError when topic is soft-deleted", async () => {
      const topic = fakeTopic({ deletedAt: new Date("2025-06-01") });
      (ds.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(topic);

      await expect(
        service.getOne({
          id: topic.id,
          studentId: topic.studentId,
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ─── getMany ───────────────────────────────────────────────────

  describe("getMany", () => {
    it("returns mapped topics for a student", async () => {
      const topics = [
        fakeTopic({ id: "aaaa-1111-2222-3333-444444444444", title: "Topic 1" }),
        fakeTopic({ id: "bbbb-1111-2222-3333-444444444444", title: "Topic 2" }),
      ];
      (ds.getMany as ReturnType<typeof vi.fn>).mockResolvedValue(topics);

      const result = await service.getMany({
        studentId: "11111111-2222-3333-4444-555555555555",
      });

      expect(ds.getMany).toHaveBeenCalledWith({
        studentId: "11111111-2222-3333-4444-555555555555",
      });
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Topic 1");
      expect(result[1].title).toBe("Topic 2");
      expect(result[0]).not.toHaveProperty("studentId");
      expect(result[0]).not.toHaveProperty("deletedAt");
    });

    it("returns empty array when student has no topics", async () => {
      (ds.getMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.getMany({
        studentId: "11111111-2222-3333-4444-555555555555",
      });

      expect(result).toEqual([]);
    });
  });

  // ─── createOne ─────────────────────────────────────────────────

  describe("createOne", () => {
    it("creates a topic and returns mapped result", async () => {
      const topic = fakeTopic();
      (ds.createOne as ReturnType<typeof vi.fn>).mockResolvedValue(topic);

      const result = await service.createOne({
        studentId: topic.studentId,
        title: "Test Topic",
        description: "A test description",
      });

      expect(ds.createOne).toHaveBeenCalledWith({
        studentId: topic.studentId,
        title: "Test Topic",
        description: "A test description",
      });
      expect(result).toEqual({
        id: topic.id,
        title: topic.title,
        description: topic.description,
        createdAt: topic.createdAt.toISOString(),
        updatedAt: topic.updatedAt.toISOString(),
      });
    });

    it("creates a topic with description undefined", async () => {
      const topic = fakeTopic({ description: null });
      (ds.createOne as ReturnType<typeof vi.fn>).mockResolvedValue(topic);

      const result = await service.createOne({
        studentId: topic.studentId,
        title: "Test Topic",
      });

      expect(ds.createOne).toHaveBeenCalledWith({
        studentId: topic.studentId,
        title: "Test Topic",
        description: undefined,
      });
      expect(result.description).toBeNull();
    });
  });

  // ─── updateOne ─────────────────────────────────────────────────

  describe("updateOne", () => {
    it("updates and returns mapped result", async () => {
      const existing = fakeTopic();
      const updated = fakeTopic({
        title: "Updated Title",
        updatedAt: new Date("2025-06-01"),
      });
      (ds.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
      (ds.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

      const result = await service.updateOne({
        id: existing.id,
        studentId: existing.studentId,
        title: "Updated Title",
      });

      expect(ds.getOne).toHaveBeenCalledWith({ id: existing.id });
      expect(ds.updateOne).toHaveBeenCalledWith({
        id: existing.id,
        title: "Updated Title",
        description: undefined,
      });
      expect(result.title).toBe("Updated Title");
    });

    it("throws NotFoundError if topic does not exist", async () => {
      (ds.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.updateOne({
          id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          studentId: "11111111-2222-3333-4444-555555555555",
          title: "Nope",
        }),
      ).rejects.toThrow(NotFoundError);

      expect(ds.updateOne).not.toHaveBeenCalled();
    });

    it("throws NotFoundError if topic belongs to different student", async () => {
      const existing = fakeTopic();
      (ds.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

      await expect(
        service.updateOne({
          id: existing.id,
          studentId: "99999999-8888-7777-6666-555555555555",
          title: "Hijack",
        }),
      ).rejects.toThrow(NotFoundError);

      expect(ds.updateOne).not.toHaveBeenCalled();
    });
  });

  // ─── deleteOne ─────────────────────────────────────────────────

  describe("deleteOne", () => {
    it("deletes and returns { id }", async () => {
      const existing = fakeTopic();
      const deleted = fakeTopic({ deletedAt: new Date("2025-06-01") });
      (ds.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
      (ds.deleteOne as ReturnType<typeof vi.fn>).mockResolvedValue(deleted);

      const result = await service.deleteOne({
        id: existing.id,
        studentId: existing.studentId,
      });

      expect(ds.getOne).toHaveBeenCalledWith({ id: existing.id });
      expect(ds.deleteOne).toHaveBeenCalledWith({ id: existing.id });
      expect(result).toEqual({ id: existing.id });
      expect(result).not.toHaveProperty("title");
      expect(result).not.toHaveProperty("deletedAt");
    });

    it("throws NotFoundError if topic does not exist", async () => {
      (ds.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.deleteOne({
          id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          studentId: "11111111-2222-3333-4444-555555555555",
        }),
      ).rejects.toThrow(NotFoundError);

      expect(ds.deleteOne).not.toHaveBeenCalled();
    });

    it("throws NotFoundError if topic belongs to different student", async () => {
      const existing = fakeTopic();
      (ds.getOne as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

      await expect(
        service.deleteOne({
          id: existing.id,
          studentId: "99999999-8888-7777-6666-555555555555",
        }),
      ).rejects.toThrow(NotFoundError);

      expect(ds.deleteOne).not.toHaveBeenCalled();
    });
  });
});
