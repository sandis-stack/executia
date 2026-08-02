import Fastify, { type FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import type { AIProviderAdapter } from "@executia/core-ai";
import { createBearerAuthHook } from "./auth";
import type { Env } from "./env";
import { createOpenAIResponsesProvider } from "./providers/openai-provider";
import { runExecute } from "./services/execute-service";
import { ExecuteRequestSchema } from "./services/schemas";

export const CORE_VERSION = "1.0";

export type BuildServerOptions = {
  env: Env;
  /** Injected for tests — production uses OpenAI Responses adapter only. */
  provider?: AIProviderAdapter;
  /** Skip OpenAI key requirement when provider is injected. */
  allowMissingOpenAI?: boolean;
};

export async function buildServer(
  options: BuildServerOptions,
): Promise<FastifyInstance> {
  const { env } = options;

  const provider =
    options.provider ??
    createOpenAIResponsesProvider({
      apiKey: env.OPENAI_API_KEY!,
      model: env.OPENAI_MODEL,
      baseUrl: env.AI_BASE_URL,
    });

  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "test" ? "error" : "info",
      redact: {
        paths: [
          "req.headers.authorization",
          "OPENAI_API_KEY",
          "EXECUTIA_API_KEY",
          "env.OPENAI_API_KEY",
          "env.EXECUTIA_API_KEY",
        ],
        remove: true,
      },
    },
    bodyLimit: 64 * 1024,
    trustProxy: true,
  });

  await app.register(rateLimit, {
    max: 60,
    timeWindow: "1 minute",
    hook: "preHandler",
    allowList: (req) => req.url === "/health" || req.url.startsWith("/health?"),
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "executia-api",
    coreVersion: CORE_VERSION,
  }));

  app.post(
    "/execute",
    {
      preHandler: createBearerAuthHook(env.EXECUTIA_API_KEY),
    },
    async (request, reply) => {
      const parsed = ExecuteRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: "Invalid request",
          details: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        });
      }

      try {
        const result = await runExecute(parsed.data, provider);
        return reply.code(result.httpStatus).send(result.body);
      } catch (err) {
        request.log.error(
          { err: err instanceof Error ? err.message : "unknown" },
          "execute failed",
        );
        return reply.code(500).send({
          error: "Internal error",
          message: "Unexpected failure while executing through EXECUTIA Core.",
        });
      }
    },
  );

  return app;
}
