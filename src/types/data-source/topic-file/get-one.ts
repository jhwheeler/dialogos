import { z } from "zod";

export const GetOneTopicFileDataSourceInputSchema = z.object({
  id: z.string().uuid(),
});

export type GetOneTopicFileDataSourceInput = z.infer<typeof GetOneTopicFileDataSourceInputSchema>;

export const GetOneTopicFileDataSourceOutputSchema = z.object({
  id: z.string().uuid(),
  topicId: z.string().uuid(),
  kind: z.string(),
  storageKey: z.string(),
  originalName: z.string(),
  mimeType: z.string().nullable(),
  sizeBytes: z.coerce.bigint(),
  createdAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

export type GetOneTopicFileDataSourceOutput = z.infer<typeof GetOneTopicFileDataSourceOutputSchema>;
