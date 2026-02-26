import { z } from "zod";

export const DeleteOneSessionDataSourceInputSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteOneSessionDataSourceInput = z.infer<typeof DeleteOneSessionDataSourceInputSchema>;

export const DeleteOneSessionDataSourceOutputSchema = z.object({
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

export type DeleteOneSessionDataSourceOutput = z.infer<
  typeof DeleteOneSessionDataSourceOutputSchema
>;
