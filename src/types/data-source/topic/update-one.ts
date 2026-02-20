import { z } from "zod";

export const UpdateOneTopicDataSourceInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
});

export type UpdateOneTopicDataSourceInput = z.infer<typeof UpdateOneTopicDataSourceInputSchema>;

export const UpdateOneTopicDataSourceOutputSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

export type UpdateOneTopicDataSourceOutput = z.infer<typeof UpdateOneTopicDataSourceOutputSchema>;
