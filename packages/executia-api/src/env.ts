import { z } from "zod";

/**
 * Startup environment validation.
 * Secrets are never logged by callers of this module.
 */
export const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  EXECUTIA_API_KEY: z.string().min(1),
  AI_BASE_URL: z.string().url().optional(),
  HOST: z.string().default("127.0.0.1"),
  NODE_ENV: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(
  source: NodeJS.ProcessEnv = process.env,
  options?: { requireOpenAI?: boolean },
): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment: missing or invalid ${fields}`);
  }
  if (options?.requireOpenAI !== false && !parsed.data.OPENAI_API_KEY) {
    // Allow tests to inject a mock provider without a real OpenAI key.
    if (options?.requireOpenAI === true) {
      throw new Error("Invalid environment: OPENAI_API_KEY is required");
    }
  }
  return parsed.data;
}

export function loadProductionEnv(
  source: NodeJS.ProcessEnv = process.env,
): Env {
  const env = loadEnv(source, { requireOpenAI: false });
  if (!env.OPENAI_API_KEY) {
    throw new Error("Invalid environment: OPENAI_API_KEY is required");
  }
  return env;
}
