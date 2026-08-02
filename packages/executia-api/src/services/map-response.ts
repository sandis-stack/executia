import type { VerifiedCoreResponse } from "@executia/core-ai";
import type { ExecuteApiResponse, PipelineStatus } from "./schemas";

/**
 * Map Core VerifiedCoreResponse → HTTP API envelope.
 * Does not recalculate progress — reads Core report / response text only.
 */
export function mapCoreResult(
  result: VerifiedCoreResponse,
): ExecuteApiResponse {
  const report = result.executiaReport;
  const fromText = {
    completed: extractPercent(result.response, "Completed %:"),
    remaining: extractPercent(result.response, "Remaining %:"),
    focus: extractLine(result.response, "Current Focus:"),
    next: extractLine(result.response, "Next Step:"),
  };

  const completedPercent =
    fromText.completed ?? report.overallProgressPercent ?? null;
  const remainingPercent =
    fromText.remaining ??
    (completedPercent == null ? null : Math.max(0, 100 - completedPercent));

  return {
    executionId: result.executionId ?? "unknown",
    status: report.executionStatus,
    mission: report.primaryGoal,
    completedPercent,
    remainingPercent,
    currentFocus: fromText.focus ?? report.currentTask,
    nextStep: fromText.next ?? report.nextPriorityAction,
    response: result.response,
    pipeline: buildPipeline(result),
  };
}

function buildPipeline(result: VerifiedCoreResponse): PipelineStatus {
  const report = result.executiaReport;
  const status = report.executionStatus;
  const text = result.response;

  const pre = report.preValidation;

  let focusValidation = "SKIPPED";
  if (pre === "BLOCKED") {
    focusValidation = "NOT_REACHED";
  } else if (status === "CLARIFICATION_REQUIRED") {
    focusValidation = "NEEDS_CLARIFICATION";
  } else if (
    text.includes("REJECTED:") &&
    report.postValidation == null &&
    status === "BLOCKED" &&
    !text.includes("Development Cell")
  ) {
    focusValidation = "REJECTED";
  } else if (
    status === "APPROVED" ||
    status === "PROVIDER_FAILED" ||
    report.postValidation != null ||
    text.includes("Development Cell")
  ) {
    focusValidation = "APPROVED";
  }

  let developmentCell = "NOT_REACHED";
  if (focusValidation === "APPROVED" || focusValidation === "SKIPPED") {
    if (text.includes("Development Cell") && status === "BLOCKED") {
      developmentCell = "BLOCKED";
    } else if (
      status === "APPROVED" ||
      status === "PROVIDER_FAILED" ||
      report.postValidation != null
    ) {
      developmentCell = "LOADED";
    } else if (pre !== "BLOCKED" && focusValidation === "APPROVED") {
      developmentCell = "LOADED";
    }
  }

  let aiExecutor = "NOT_REACHED";
  if (status === "PROVIDER_FAILED") {
    aiExecutor = "FAILED";
  } else if (report.postValidation != null || status === "APPROVED") {
    aiExecutor = "SUCCESS";
  }

  return {
    preValidation: pre,
    focusValidation,
    developmentCell,
    aiExecutor,
    postValidation: report.postValidation,
  };
}

/**
 * HTTP status mapping (documented):
 * - 200: APPROVED
 * - 409: clarification / context blocks (PRE, cell missing, clarification)
 * - 422: rejected execution (Focus/POST reject)
 * - 502: AI provider failure
 * - 500: unexpected
 */
export function httpStatusForCoreResult(result: VerifiedCoreResponse): number {
  const status = result.executiaReport.executionStatus;
  const text = result.response;

  if (status === "APPROVED" || status === "APPROVED_WITH_WARNINGS") {
    return 200;
  }
  if (status === "PROVIDER_FAILED") {
    return 502;
  }
  if (status === "CLARIFICATION_REQUIRED" || status === "PRE_BLOCKED") {
    return 409;
  }
  if (status === "BLOCKED") {
    if (text.startsWith("REJECTED:") || text.includes("REJECTED:")) {
      return 422;
    }
    return 409;
  }
  return 500;
}

function extractLine(text: string, label: string): string | null {
  const line = text.split("\n").find((l) => l.startsWith(label));
  if (!line) return null;
  return line.slice(label.length).trim() || null;
}

function extractPercent(text: string, label: string): number | null {
  const value = extractLine(text, label);
  if (value == null) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}
