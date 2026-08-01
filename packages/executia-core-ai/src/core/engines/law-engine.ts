import type { LoadedConstitution } from "@/core/constitution/laws";
import type { GoalAlignment } from "@/domain/schemas";

export type LawCheck = {
  lawId: string;
  ok: boolean;
  reason: string;
};

export type LawEvaluation = {
  ok: boolean;
  checks: LawCheck[];
};

export function evaluatePreLaws(input: {
  constitution: LoadedConstitution | null;
  goalLoaded: boolean;
  alignment: GoalAlignment | null;
  memoryLoaded: boolean;
}): LawEvaluation {
  const checks: LawCheck[] = [
    {
      lawId: "GOAL",
      ok: Boolean(input.constitution) && input.goalLoaded,
      reason: input.goalLoaded
        ? "Primary goal loaded."
        : "Primary goal missing.",
    },
    {
      lawId: "FOCUS",
      ok: input.alignment !== null,
      reason: input.alignment
        ? `Alignment=${input.alignment}`
        : "Goal alignment not classified.",
    },
    {
      lawId: "MEMORY",
      ok: input.memoryLoaded,
      reason: input.memoryLoaded
        ? "Persistent memory loaded."
        : "Memory not loaded before execution.",
    },
    {
      lawId: "VALIDATION",
      ok: Boolean(input.constitution),
      reason: input.constitution
        ? "Constitution present for validation."
        : "Constitution missing — cannot validate.",
    },
  ];

  if (input.alignment === "CONFLICTING") {
    checks.push({
      lawId: "FOCUS",
      ok: false,
      reason: "CONFLICTING requests are blocked under FOCUS LAW.",
    });
  }

  return { ok: checks.every((c) => c.ok), checks };
}

export function evaluateDeliveryLaws(input: {
  prePassed: boolean;
  postPassed: boolean;
  reportComplete: boolean;
  nextPriorityAction: string;
  progressOk: boolean;
  noRawProvider: boolean;
  ledgerOk: boolean;
  developmentCellPresent: boolean;
}): LawEvaluation {
  const checks: LawCheck[] = [
    {
      lawId: "VALIDATION",
      ok: input.prePassed && input.postPassed,
      reason:
        input.prePassed && input.postPassed
          ? "Pre and post validation passed."
          : "Validation incomplete.",
    },
    {
      lawId: "REPORTING",
      ok: input.reportComplete,
      reason: input.reportComplete
        ? "EXECUTIA report complete."
        : "EXECUTIA report incomplete.",
    },
    {
      lawId: "EXECUTION",
      ok: Boolean(input.nextPriorityAction?.trim()),
      reason: input.nextPriorityAction?.trim()
        ? "Next priority action present."
        : "Missing next priority action.",
    },
    {
      lawId: "PROGRESS",
      ok: input.progressOk,
      reason: input.progressOk
        ? "Progress evidence-based or NOT_MEASURABLE."
        : "Invented or invalid progress.",
    },
    {
      lawId: "TRUTH",
      ok: input.noRawProvider,
      reason: input.noRawProvider
        ? "No raw provider output."
        : "Raw provider output detected.",
    },
    {
      lawId: "MEMORY",
      ok: input.ledgerOk,
      reason: input.ledgerOk
        ? "Ledger written."
        : "Ledger write failed.",
    },
    {
      lawId: "DEVELOPMENT_CELL",
      ok: input.developmentCellPresent,
      reason: input.developmentCellPresent
        ? "Development Cell assessment present."
        : "Development Cell missing.",
    },
  ];
  return { ok: checks.every((c) => c.ok), checks };
}

/** Development Cell must never unlock or rewrite laws. */
export function assertConstitutionImmutable(
  beforeLocked: boolean,
  afterLocked: boolean,
  appliedProposal: boolean,
): LawCheck {
  const ok = beforeLocked && afterLocked && !appliedProposal;
  return {
    lawId: "DEVELOPMENT_CELL",
    ok,
    reason: ok
      ? "Constitution unchanged by Development Cell."
      : "Illegal Constitution mutation attempted.",
  };
}
