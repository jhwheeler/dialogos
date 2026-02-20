import { z } from "zod";

export const CreateOneTopicFileDataSourceInputSchema = z.object({
  topicId: z.string().uuid(),
  kind: z.string(),
  storageKey: z.string(),
  originalName: z.string(),
  mimeType: z.string().optional(),
  sizeBytes: z.coerce.bigint(),
});

export type CreateOneTopicFileDataSourceInput = z.infer<
  typeof CreateOneTopicFileDataSourceInputSchema
>;

export const CreateOneTopicFileDataSourceOutputSchema = z.object({
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

export type CreateOneTopicFileDataSourceOutput = z.infer<
  typeof CreateOneTopicFileDataSourceOutputSchema
>;
