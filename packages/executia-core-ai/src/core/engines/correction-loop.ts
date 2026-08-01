import type { PostValidationOutcome } from "@/core/engines/post-validation-engine";

export const DEFAULT_MAX_CORRECTION_ATTEMPTS = 2;

export function shouldCorrect(
  outcome: PostValidationOutcome,
  attemptIndex: number,
  maxAttempts = DEFAULT_MAX_CORRECTION_ATTEMPTS,
): boolean {
  return (
    outcome.status === "REQUIRES_CORRECTION" && attemptIndex < maxAttempts
  );
}

export function buildCorrectionBrief(outcome: PostValidationOutcome): string {
  return [
    "Previous output failed EXECUTIA post-validation.",
    "Fix:",
    ...outcome.reasons.map((r) => `- ${r}`),
    "Preserve primary goal. Include nextPriorityAction. Return ProviderResponseSchema JSON only.",
  ].join("\n");
}
