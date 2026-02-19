import { z } from "zod";
const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().default("0.0.0.0"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1)
});
export function parseEnv(source = process.env) {
    return EnvSchema.parse(source);
}
