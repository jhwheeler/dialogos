import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(32),
  SUPABASE_JWT_ISSUER: z.string().url().optional(),
  CORS_ORIGIN: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_REGION: z.string().optional(),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),

  // ─── Provider configuration ─────────────────────────────────
  LLM_PROVIDER: z.enum(["anthropic", "openai"]).default("anthropic").optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-20250514").optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini").optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  STT_PROVIDER: z.enum(["openai-whisper"]).default("openai-whisper").optional(),
  STT_MODEL: z.string().default("whisper-1").optional(),
  STT_BASE_URL: z.string().url().optional(),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function parseEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return EnvSchema.parse(source);
}
