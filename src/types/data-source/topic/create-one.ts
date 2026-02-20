import { z } from "zod";

export const CreateOneTopicDataSourceInputSchema = z.object({
  studentId: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
});

export type CreateOneTopicDataSourceInput = z.infer<typeof CreateOneTopicDataSourceInputSchema>;

export const CreateOneTopicDataSourceOutputSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

export type CreateOneTopicDataSourceOutput = z.infer<typeof CreateOneTopicDataSourceOutputSchema>;
