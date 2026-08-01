import { prisma } from "@/lib/prisma";
import type { DevelopmentCellReport } from "@/domain/schemas";
import type { PostValidationOutcome } from "@/core/engines/post-validation-engine";
import { assertConstitutionImmutable } from "@/core/engines/law-engine";

/**
 * EXECUTIA Core MVP 1.0 — Development Cell Loader
 *
 * Loads existing Development Cell context. Does not invent fields,
 * rewrite requests, update the cell, calculate progress, or call AI.
 */

export type DevelopmentCellContext = {
  mission: string;
  currentGoal: string;
  currentFocus: string;
  completedTasks: string[];
  remainingTasks: string[];
  lessonsLearned: string[];
  openDecisions: string[];
  knownRisks: string[];
  nextStep: string;
};

export type DevelopmentCellField =
  | "mission"
  | "currentGoal"
  | "currentFocus"
  | "completedTasks"
  | "remainingTasks"
  | "lessonsLearned"
  | "openDecisions"
  | "knownRisks"
  | "nextStep";

export type DevelopmentCellLoadResult = {
  status: "LOADED" | "BLOCKED";
  developmentCell: DevelopmentCellContext | null;
  missingFields: Array<DevelopmentCellField | "developmentCell">;
  reason: string;
};

const REQUIRED_STRING_FIELDS: DevelopmentCellField[] = [
  "mission",
  "currentGoal",
  "currentFocus",
  "nextStep",
];

const REQUIRED_ARRAY_FIELDS: DevelopmentCellField[] = [
  "completedTasks",
  "remainingTasks",
  "lessonsLearned",
  "openDecisions",
  "knownRisks",
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

/**
 * Load / validate the active Development Cell context.
 * Does not create, infer, or modify missing data.
 */
export function loadDevelopmentCell(
  developmentCell: DevelopmentCellContext | null | undefined,
): DevelopmentCellLoadResult {
  if (developmentCell == null) {
    return {
      status: "BLOCKED",
      developmentCell: null,
      missingFields: ["developmentCell"],
      reason: "Development Cell does not exist.",
    };
  }

  const missingFields: Array<DevelopmentCellField | "developmentCell"> = [];

  for (const field of REQUIRED_STRING_FIELDS) {
    if (!isNonEmptyString(developmentCell[field])) {
      missingFields.push(field);
    }
  }

  for (const field of REQUIRED_ARRAY_FIELDS) {
    if (!isStringArray(developmentCell[field])) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return {
      status: "BLOCKED",
      developmentCell: null,
      missingFields,
      reason: `Required Development Cell context unavailable: ${missingFields.join(", ")}.`,
    };
  }

  // Pass through without modifying loaded data
  return {
    status: "LOADED",
    developmentCell,
    missingFields: [],
    reason: "Development Cell loaded.",
  };
}

/**
 * Development Update (MVP 1.0) — only after POST APPROVED.
 * Updates only completed/remaining tasks, lessons, next step.
 * Does not invent information or overwrite unnecessarily.
 */
export function applyDevelopmentUpdate(input: {
  developmentCell: DevelopmentCellContext;
  completedTasks: string[];
  remainingTasks: string[];
  lessonsLearned: string[];
  nextStep: string;
}): DevelopmentCellContext {
  const cell = input.developmentCell;

  const mergeUnique = (existing: string[], incoming: string[]) => {
    const out = [...existing];
    for (const item of incoming) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      if (!out.some((e) => e.toLowerCase() === trimmed.toLowerCase())) {
        out.push(trimmed);
      }
    }
    return out;
  };

  const completedTasks = mergeUnique(cell.completedTasks, input.completedTasks);
  const remainingTasks = mergeUnique(cell.remainingTasks, input.remainingTasks)
    .filter(
      (t) =>
        !completedTasks.some((c) => c.toLowerCase() === t.toLowerCase()),
    );
  const lessonsLearned = mergeUnique(
    cell.lessonsLearned,
    input.lessonsLearned,
  );
  const nextStep = input.nextStep.trim()
    ? input.nextStep.trim()
    : cell.nextStep;

  return {
    mission: cell.mission,
    currentGoal: cell.currentGoal,
    currentFocus: cell.currentFocus,
    completedTasks,
    remainingTasks,
    lessonsLearned,
    openDecisions: cell.openDecisions,
    knownRisks: cell.knownRisks,
    nextStep,
  };
}

/**
 * Development Cell may propose improvements but MUST NOT modify Constitution.
 */
export async function runDevelopmentCell(input: {
  constitutionVersionId: string;
  goalId: string;
  executionId: string;
  post: PostValidationOutcome | null;
  warnings: string[];
  approved: boolean;
}): Promise<DevelopmentCellReport> {
  const before = await prisma.constitutionVersion.findUniqueOrThrow({
    where: { id: input.constitutionVersionId },
  });

  let finding = "Execution completed under Constitution without rule gaps.";
  let proposal: string | null = null;
  let status: DevelopmentCellReport["status"] = "NO_CHANGE";
  let observedFailure: string | null = null;
  let repeatedPattern: string | null = null;
  let missingRule: string | null = null;
  const evidence: string[] = [];

  if (!input.approved && input.post) {
    observedFailure = input.post.reasons.join("; ");
    finding = `Observed validation failure: ${observedFailure}`;
    if (input.post.reasons.some((r) => r.includes("primary goal"))) {
      missingRule = "Stronger goal-reference enforcement in provider prompt.";
      proposal = "Add mandatory primaryGoal echo field in provider schema.";
      status = "PROPOSED";
    } else {
      proposal = "Tighten post-validation correction prompts.";
      status = "PROPOSED";
    }
    evidence.push(...input.post.reasons);
  } else if (input.warnings.length > 0) {
    finding = `Warnings observed: ${input.warnings.join("; ")}`;
    proposal = "Consider minimum response length rule.";
    status = "PROPOSED";
    evidence.push(...input.warnings);
  }

  // NEVER apply — applied stays false
  await prisma.developmentProposal.create({
    data: {
      constitutionVersionId: input.constitutionVersionId,
      goalId: input.goalId,
      executionId: input.executionId,
      finding,
      proposal,
      status,
      observedFailure,
      repeatedPattern,
      missingRule,
      evidence: evidence.join(" | ") || null,
      applied: false,
    },
  });

  const after = await prisma.constitutionVersion.findUniqueOrThrow({
    where: { id: input.constitutionVersionId },
  });

  const immutability = assertConstitutionImmutable(
    before.locked,
    after.locked,
    false,
  );
  if (!immutability.ok) {
    throw new Error(immutability.reason);
  }

  // Ensure laws JSON unchanged
  if (JSON.stringify(before.lawsJson) !== JSON.stringify(after.lawsJson)) {
    throw new Error("Development Cell illegally mutated Constitution laws.");
  }

  return { finding, proposal, status };
}
