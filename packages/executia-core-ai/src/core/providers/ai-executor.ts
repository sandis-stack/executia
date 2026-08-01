import type { DevelopmentCellContext } from "@/core/engines/development-cell";
import type { ExecutionSpec } from "@/domain/schemas";
import type {
  AIProviderAdapter,
  ProviderCallResult,
} from "@/core/providers/ai-provider-adapter";

/**
 * EXECUTIA Core MVP 1.0 — AI Executor
 *
 * Execution adapter only. No validation, rewrite, classification,
 * progress, memory updates, Development Cell updates, or POST Validation.
 * Does not retry automatically.
 */

export type AiExecutorInput = {
  provider: AIProviderAdapter;
  executionId: string;
  request: string;
  mission: { id: string; title: string; description?: string };
  currentFocus: { label: string };
  developmentCell: DevelopmentCellContext;
  /** Validated execution context assembled upstream — executor does not alter it. */
  spec: ExecutionSpec;
  options?: { correctionBrief?: string };
};

export type AiExecutorResult = {
  status: "SUCCESS" | "FAILED";
  provider: string;
  model: string;
  executionId: string;
  rawResponse: string | null;
  /** Provider transport result for ledger/recording only — not business validation. */
  transport: ProviderCallResult;
};

/**
 * Call the configured AI provider once and return the raw response.
 */
export async function runAiExecutor(
  input: AiExecutorInput,
): Promise<AiExecutorResult> {
  // Require validated context was received; do not classify or rewrite.
  if (
    !input.executionId ||
    !input.request ||
    !input.mission?.id ||
    !input.mission?.title ||
    !input.currentFocus?.label ||
    !input.developmentCell ||
    !input.spec
  ) {
    const transport: ProviderCallResult = {
      ok: false,
      provider: input.provider.name,
      model: "unknown",
      errorMessage: "AI Executor received incomplete execution context.",
      latencyMs: 0,
      requestPayload: {},
    };
    return {
      status: "FAILED",
      provider: transport.provider,
      model: transport.model,
      executionId: input.executionId || "unknown",
      rawResponse: null,
      transport,
    };
  }

  // Single provider call — no automatic retry
  const transport = await input.provider.execute(input.spec, input.options);

  if (!transport.ok) {
    return {
      status: "FAILED",
      provider: transport.provider,
      model: transport.model,
      executionId: input.executionId,
      rawResponse: transport.rawText ?? null,
      transport,
    };
  }

  return {
    status: "SUCCESS",
    provider: transport.provider,
    model: transport.model,
    executionId: input.executionId,
    rawResponse: transport.rawText,
    transport,
  };
}
