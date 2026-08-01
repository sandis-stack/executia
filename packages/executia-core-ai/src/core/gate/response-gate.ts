import {
  VerifiedCoreResponseSchema,
  type ExecutiaReport,
  type VerifiedCoreResponse,
} from "@/domain/schemas";
import { evaluateDeliveryLaws } from "@/core/engines/law-engine";

export type GateCandidate = {
  response: string;
  report: ExecutiaReport;
  executionId: string;
  rawProviderText?: string | null;
  ledgerOk: boolean;
  /** When true, delivery is a blocked explanation (still goes through gate). */
  blockedDelivery?: boolean;
};

/**
 * Sole user-facing delivery gateway.
 * Nothing else may return VerifiedCoreResponse to callers of the Core pipeline.
 */
export function deliverThroughResponseGate(
  candidate: GateCandidate,
): VerifiedCoreResponse {
  const report = candidate.report;
  const noRaw =
    !candidate.rawProviderText ||
    (!candidate.response.includes('"choices"') &&
      !candidate.response.includes('"usage"') &&
      candidate.response !== candidate.rawProviderText);

  const prePassed =
    report.preValidation === "APPROVED" ||
    report.preValidation === "CORRECTED";
  const postPassed =
    report.postValidation === "APPROVED" ||
    report.postValidation === "APPROVED_WITH_WARNINGS";

  const progressOk =
    report.progressStatus === "NOT_MEASURABLE"
      ? report.overallProgressPercent === null &&
        report.taskProgressPercent === null
      : report.overallProgressPercent !== null &&
        report.overallProgressPercent >= 0 &&
        report.overallProgressPercent <= 100;

  const reportComplete = Boolean(
    report.primaryGoal &&
      report.currentTask &&
      report.goalAlignment &&
      report.nextPriorityAction &&
      report.developmentCell?.finding,
  );

  if (candidate.blockedDelivery) {
    // Blocked path: still must not leak raw provider; report must explain block
    if (!noRaw) {
      throw new Error("ResponseGate: raw provider output blocked.");
    }
    if (!reportComplete) {
      throw new Error("ResponseGate: blocked delivery requires complete report.");
    }
    const payload = {
      response: candidate.response,
      executiaReport: report,
      executionId: candidate.executionId,
      deliveredBy: "ResponseGate" as const,
    };
    return VerifiedCoreResponseSchema.parse(payload);
  }

  const laws = evaluateDeliveryLaws({
    prePassed,
    postPassed,
    reportComplete,
    nextPriorityAction: report.nextPriorityAction,
    progressOk,
    noRawProvider: noRaw,
    ledgerOk: candidate.ledgerOk,
    developmentCellPresent: Boolean(report.developmentCell?.finding),
  });

  if (!laws.ok) {
    throw new Error(
      `ResponseGate rejected delivery: ${laws.checks
        .filter((c) => !c.ok)
        .map((c) => c.reason)
        .join(" | ")}`,
    );
  }

  if (!report.primaryGoal.trim()) {
    throw new Error("ResponseGate: primary goal missing.");
  }
  if (!report.currentTask.trim()) {
    throw new Error("ResponseGate: current task missing.");
  }
  if (!report.goalAlignment) {
    throw new Error("ResponseGate: goal alignment missing.");
  }

  const payload = {
    response: candidate.response,
    executiaReport: report,
    executionId: candidate.executionId,
    deliveredBy: "ResponseGate" as const,
  };
  return VerifiedCoreResponseSchema.parse(payload);
}

/** Test helper: prove only this module stamps deliveredBy. */
export const RESPONSE_GATE_MARKER = "ResponseGate" as const;
