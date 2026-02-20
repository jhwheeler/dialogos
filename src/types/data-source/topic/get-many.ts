import { z } from "zod";

export const GetManyTopicDataSourceInputSchema = z.object({
  studentId: z.string().uuid(),
});

export type GetManyTopicDataSourceInput = z.infer<typeof GetManyTopicDataSourceInputSchema>;

export const GetManyTopicDataSourceOutputSchema = z.array(
  z.object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    deletedAt: z.coerce.date().nullable(),
  }),
);

export type GetManyTopicDataSourceOutput = z.infer<typeof GetManyTopicDataSourceOutputSchema>;
