import { z } from "zod";

export const DeleteOneTopicDataSourceInputSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteOneTopicDataSourceInput = z.infer<typeof DeleteOneTopicDataSourceInputSchema>;

export const DeleteOneTopicDataSourceOutputSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().nullable(),
});

export type DeleteOneTopicDataSourceOutput = z.infer<typeof DeleteOneTopicDataSourceOutputSchema>;
