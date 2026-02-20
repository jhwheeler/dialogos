import { z } from "zod";

export const GetManyTopicApiOutputSchema = z.object({
  topics: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      description: z.string().nullable(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
});

export type GetManyTopicApiOutput = z.infer<typeof GetManyTopicApiOutputSchema>;
