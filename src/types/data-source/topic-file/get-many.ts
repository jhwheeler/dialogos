import { z } from "zod";

export const GetManyTopicFileDataSourceInputSchema = z.object({
  topicId: z.string().uuid(),
});

export type GetManyTopicFileDataSourceInput = z.infer<typeof GetManyTopicFileDataSourceInputSchema>;

export const GetManyTopicFileDataSourceOutputSchema = z.array(
  z.object({
    id: z.string().uuid(),
    topicId: z.string().uuid(),
    kind: z.string(),
    storageKey: z.string(),
    originalName: z.string(),
    mimeType: z.string().nullable(),
    sizeBytes: z.coerce.bigint(),
    createdAt: z.coerce.date(),
    deletedAt: z.coerce.date().nullable(),
  }),
);

export type GetManyTopicFileDataSourceOutput = z.infer<
  typeof GetManyTopicFileDataSourceOutputSchema
>;
