import { z } from "zod";

export const GetOneSessionDataSourceInputSchema = z.object({
  id: z.string().uuid(),
});

export type GetOneSessionDataSourceInput = z.infer<typeof GetOneSessionDataSourceInputSchema>;

export const GetOneSessionDataSourceOutputSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  topicId: z.string().uuid(),
  sourceId: z.string().uuid().nullable(),
  triviumStage: z.enum(["grammar", "logic", "rhetoric", "combined"]),
  status: z.enum(["draft", "active", "ended", "aborted"]),
  startedAt: z.coerce.date().nullable(),
  endedAt: z.coerce.date().nullable(),
  bookPhase: z.enum(["closed_recall", "open_text", "final_compression"]).nullable(),
  costCentsEstimate: z.number().int(),
  trialSecondsUsed: z.number().int(),
  createdAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

export type GetOneSessionDataSourceOutput = z.infer<typeof GetOneSessionDataSourceOutputSchema>;
