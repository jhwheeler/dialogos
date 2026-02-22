import { z } from "zod";

/**
 * Strict schema for student settings. All fields optional so partial
 * updates work. `.strict()` rejects unknown keys.
 */
export const StudentSettingsSchema = z
  .object({
    voiceRate: z.number().min(0.5).max(2.0).optional(),
    autoplay: z.boolean().optional(),
    strictness: z.enum(["low", "medium", "high"]).optional(),
  })
  .strict();

export type StudentSettings = z.infer<typeof StudentSettingsSchema>;
