import { timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Require Authorization: Bearer <EXECUTIA_API_KEY>.
 * Timing-safe compare. Never log the key.
 */
export function createBearerAuthHook(expectedApiKey: string) {
  const expected = Buffer.from(expectedApiKey, "utf8");

  return async function bearerAuth(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const header = request.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      await reply.code(401).send({
        error: "Unauthorized",
        message: "Missing or invalid Authorization Bearer token.",
      });
      return;
    }

    const presented = Buffer.from(header.slice("Bearer ".length), "utf8");
    const ok =
      presented.length === expected.length &&
      timingSafeEqual(presented, expected);

    if (!ok) {
      await reply.code(401).send({
        error: "Unauthorized",
        message: "Invalid API key.",
      });
    }
  };
}
