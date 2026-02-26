import { z } from "zod";

export const UpdateOneSessionDataSourceInputSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "active", "ended", "aborted"]).optional(),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional(),
  bookPhase: z.enum(["closed_recall", "open_text", "final_compression"]).nullable().optional(),
});

export type UpdateOneSessionDataSourceInput = z.infer<typeof UpdateOneSessionDataSourceInputSchema>;

export const UpdateOneSessionDataSourceOutputSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  topicId: z.string().uuid(),
  sourceId: z.string().uuid().nullable(),
  triviumStage: z.enum(["grammar", "logic", "rhetoric", "combined"]),
  status: z.enum(["draft", "active", "ended", "aborted"]),
  bookPhase: z.enum(["closed_recall", "open_text", "final_compression"]).nullable(),
  startedAt: z.coerce.date().nullable(),
  endedAt: z.coerce.date().nullable(),
  costCentsEstimate: z.number().int(),
  trialSecondsUsed: z.number().int(),
  createdAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

export type UpdateOneSessionDataSourceOutput = z.infer<
  typeof UpdateOneSessionDataSourceOutputSchema
>;
