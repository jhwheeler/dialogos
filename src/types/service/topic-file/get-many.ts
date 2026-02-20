import { z } from "zod";

export const GetManyTopicFileServiceInputSchema = z.object({
  topicId: z.string().uuid(),
  studentId: z.string().uuid(),
});

export type GetManyTopicFileServiceInput = z.infer<typeof GetManyTopicFileServiceInputSchema>;

export const GetManyTopicFileServiceOutputSchema = z.array(
  z.object({
    id: z.string().uuid(),
    kind: z.string(),
    storageKey: z.string(),
    originalName: z.string(),
    mimeType: z.string().nullable(),
    sizeBytes: z.number(),
    createdAt: z.coerce.date(),
  }),
);

export type GetManyTopicFileServiceOutput = z.infer<typeof GetManyTopicFileServiceOutputSchema>;
