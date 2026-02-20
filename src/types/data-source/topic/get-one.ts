import { z } from "zod";

export const GetOneTopicDataSourceInputSchema = z.object({
  id: z.string().uuid(),
});

export type GetOneTopicDataSourceInput = z.infer<typeof GetOneTopicDataSourceInputSchema>;

export const GetOneTopicDataSourceOutputSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

export type GetOneTopicDataSourceOutput = z.infer<typeof GetOneTopicDataSourceOutputSchema>;
