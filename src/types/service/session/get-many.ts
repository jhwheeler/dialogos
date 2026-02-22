import { z } from "zod";

export const GetManySessionServiceInputSchema = z.object({
  topicId: z.string().uuid(),
  studentId: z.string().uuid(),
});

export type GetManySessionServiceInput = z.infer<typeof GetManySessionServiceInputSchema>;

export const GetManySessionServiceOutputSchema = z.array(
  z.object({
    id: z.string().uuid(),
    topicId: z.string().uuid(),
    sourceId: z.string().uuid().nullable(),
    triviumStage: z.enum(["grammar", "logic", "rhetoric", "combined"]),
    status: z.enum(["draft", "active", "ended", "aborted"]),
    startedAt: z.coerce.date().nullable(),
    endedAt: z.coerce.date().nullable(),
    createdAt: z.coerce.date(),
  }),
);

export type GetManySessionServiceOutput = z.infer<typeof GetManySessionServiceOutputSchema>;
