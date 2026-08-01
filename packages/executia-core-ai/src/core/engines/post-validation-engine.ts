import type { DevelopmentCellContext } from "@/core/engines/development-cell";
import type { PostValidationStatus, ProviderResponse } from "@/domain/schemas";

/**
 * EXECUTIA Core MVP 1.0 — POST Validation
 * Returns APPROVED or REJECTED only.
 */

export type PostValidationMvpStatus = "APPROVED" | "REJECTED";

export type PostValidationMvpInput = {
  aiResponse: string;
  parsed: ProviderResponse | null;
  mission: { title: string };
  currentFocus: { label: string };
  developmentCell: DevelopmentCellContext;
  rawText?: string | null;
};

export type PostValidationMvpResult = {
  status: PostValidationMvpStatus;
  reason: string;
  missionRespected: boolean;
  focusMaintained: boolean;
  outputComplete: boolean;
  safe: boolean;
  verified: boolean;
};

const UNSAFE_MARKERS = ["ignore previous instructions", "exfiltrate"];

/**
 * POST Validation — mission, focus, completeness, safety, verified.
 */
export function runPostValidation(
  input: PostValidationMvpInput,
): PostValidationMvpResult {
  if (!input.parsed) {
    return {
      status: "REJECTED",
      reason: "AI response missing or not structured — not verified.",
      missionRespected: false,
      focusMaintained: false,
      outputComplete: false,
      safe: false,
      verified: false,
    };
  }

  const response = (input.aiResponse || input.parsed.response).trim();
  const blob = `${response} ${input.parsed.nextPriorityAction}`.toLowerCase();
  const missionTitle = input.mission.title.toLowerCase();
  const focusTokens = input.currentFocus.label
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);

  const missionRespected = blob.includes(missionTitle);
  const focusMaintained =
    focusTokens.length === 0
      ? false
      : focusTokens.some((t) => blob.includes(t));
  const outputComplete = Boolean(
    response &&
      input.parsed.nextPriorityAction.trim() &&
      (input.parsed.completed.length > 0 || input.parsed.remaining.length > 0),
  );

  let safe = true;
  const raw = `${input.rawText ?? ""} ${response}`.toLowerCase();
  for (const marker of UNSAFE_MARKERS) {
    if (raw.includes(marker)) {
      safe = false;
      break;
    }
  }
  if (
    input.rawText?.includes('"choices"') &&
    input.rawText.includes('"usage"')
  ) {
    safe = false;
  }

  const verified =
    missionRespected && focusMaintained && outputComplete && safe;

  if (!verified) {
    const parts: string[] = [];
    if (!missionRespected) parts.push("Mission not respected");
    if (!focusMaintained) parts.push("Focus not maintained");
    if (!outputComplete) parts.push("Output incomplete");
    if (!safe) parts.push("Output unsafe or unverified envelope");
    return {
      status: "REJECTED",
      reason: parts.join("; "),
      missionRespected,
      focusMaintained,
      outputComplete,
      safe,
      verified: false,
    };
  }

  return {
    status: "APPROVED",
    reason: "POST Validation approved.",
    missionRespected: true,
    focusMaintained: true,
    outputComplete: true,
    safe: true,
    verified: true,
  };
}

export type PostValidationOutcome = {
  status: PostValidationStatus;
  reasons: string[];
  warnings: string[];
};

/** Legacy post-validation (unchanged contract for existing callers). */
export function postValidate(
  parsed: ProviderResponse | null,
  goalTitle: string,
  options?: { rawText?: string; parseError?: string },
): PostValidationOutcome {
  if (options?.parseError || !parsed) {
    return {
      status: "BLOCKED",
      reasons: [
        options?.parseError ??
          "Missing structured provider response — fail closed.",
      ],
      warnings: [],
    };
  }

  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!parsed.response.trim()) reasons.push("Response text is empty.");
  if (!parsed.nextPriorityAction.trim()) {
    reasons.push("Missing nextPriorityAction.");
  }
  if (parsed.completed.length === 0 && parsed.remaining.length === 0) {
    reasons.push("Must include completed and/or remaining work.");
  }

  const blob = `${parsed.response} ${parsed.nextPriorityAction}`.toLowerCase();
  if (!blob.includes(goalTitle.toLowerCase())) {
    reasons.push("Response does not reference the primary goal.");
  }

  if (
    options?.rawText?.includes('"choices"') &&
    options.rawText.includes('"usage"')
  ) {
    reasons.push("Raw provider envelope detected.");
  }

  if (parsed.response.length < 40) {
    warnings.push("Response is unusually short.");
  }

  if (reasons.length > 0) {
    const hard = reasons.some(
      (r) => r.includes("envelope") || r.includes("Missing structured"),
    );
    return {
      status: hard ? "BLOCKED" : "REQUIRES_CORRECTION",
      reasons,
      warnings,
    };
  }

  return {
    status: warnings.length ? "APPROVED_WITH_WARNINGS" : "APPROVED",
    reasons: ["Post-validation passed."],
    warnings,
  };
}
