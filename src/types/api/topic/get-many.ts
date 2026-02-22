import { z } from "zod";

export const GetManyTopicApiOutputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      description: z.string().nullable(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
  count: z.number().int(),
});

export type GetManyTopicApiOutput = z.infer<typeof GetManyTopicApiOutputSchema>;
