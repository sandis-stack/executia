import type { GoalMilestone } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProgressStatus, ProviderResponse } from "@/domain/schemas";
import type { GoalWithMilestones } from "@/core/memory/goal-memory";
import type { DevelopmentCellContext } from "@/core/engines/development-cell";

export type ProgressResult = {
  progressStatus: ProgressStatus;
  overallProgressPercent: number | null;
  taskProgressPercent: number | null;
};

/** MVP Progress object — structured only, no UI formatting. */
export type ExecutionProgress = {
  completedPercent: number;
  remainingPercent: number;
  currentFocus: string;
  nextStep: string;
};

/**
 * Progress Calculator (MVP 1.0).
 * Run only after POST APPROVED. Uses task lists from AI + cell — no invention.
 */
export function calculateExecutionProgress(input: {
  developmentCell: DevelopmentCellContext;
  completedFromAi: string[];
  remainingFromAi: string[];
  currentFocus: string;
  nextStep: string;
}): ExecutionProgress {
  const completedSet = new Set(
    [...input.developmentCell.completedTasks, ...input.completedFromAi]
      .map((t) => t.trim())
      .filter(Boolean),
  );
  const remainingSet = new Set(
    [...input.developmentCell.remainingTasks, ...input.remainingFromAi]
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => !completedSet.has(t)),
  );

  const completedCount = completedSet.size;
  const remainingCount = remainingSet.size;
  const total = completedCount + remainingCount;

  if (total === 0) {
    return {
      completedPercent: 0,
      remainingPercent: 100,
      currentFocus: input.currentFocus,
      nextStep: input.nextStep,
    };
  }

  const completedPercent = Math.floor((100 * completedCount) / total);
  const remainingPercent = 100 - completedPercent;

  return {
    completedPercent,
    remainingPercent,
    currentFocus: input.currentFocus,
    nextStep: input.nextStep,
  };
}

export function calculateProgress(
  milestones: GoalMilestone[],
): ProgressResult {
  if (milestones.length === 0) {
    return {
      progressStatus: "NOT_MEASURABLE",
      overallProgressPercent: null,
      taskProgressPercent: null,
    };
  }

  const totalWeight = milestones.reduce((s, m) => s + m.weight, 0);
  if (totalWeight <= 0) {
    return {
      progressStatus: "NOT_MEASURABLE",
      overallProgressPercent: null,
      taskProgressPercent: null,
    };
  }

  const completedWeight = milestones
    .filter((m) => m.status === "COMPLETED")
    .reduce((s, m) => s + m.weight, 0);

  const completedWithoutEvidence = milestones.some(
    (m) => m.status === "COMPLETED" && !m.evidence?.trim(),
  );
  if (completedWithoutEvidence) {
    return {
      progressStatus: "NOT_MEASURABLE",
      overallProgressPercent: null,
      taskProgressPercent: null,
    };
  }

  const overall = Math.floor((100 * completedWeight) / totalWeight);

  const active = milestones.filter(
    (m) => m.status === "IN_PROGRESS" || m.status === "PENDING",
  );
  let taskProgressPercent: number | null = null;
  if (active.length > 0) {
    const tw = active.reduce((s, m) => s + m.weight, 0);
    if (tw > 0) {
      const inProgressDone = active
        .filter((m) => m.status === "IN_PROGRESS" && m.evidence?.trim())
        .reduce((s, m) => s + m.weight, 0);
      taskProgressPercent = Math.floor((100 * inProgressDone) / tw);
    }
  }

  return {
    progressStatus: "MEASURABLE",
    overallProgressPercent: overall,
    taskProgressPercent,
  };
}

/** Never invent progress — only apply with evidence + markComplete. */
export async function applyMilestoneEvidence(
  goal: GoalWithMilestones,
  parsed: ProviderResponse,
): Promise<ProgressResult> {
  for (const evidence of parsed.milestoneEvidence) {
    if (!evidence.markComplete) continue;
    if (!evidence.evidence.trim()) continue;
    const milestone = goal.milestones.find(
      (m) =>
        (evidence.milestoneId && m.id === evidence.milestoneId) ||
        (evidence.milestoneTitle &&
          m.title.toLowerCase() === evidence.milestoneTitle.toLowerCase()),
    );
    if (!milestone) continue;
    await prisma.goalMilestone.update({
      where: { id: milestone.id },
      data: {
        status: "COMPLETED",
        evidence: evidence.evidence,
        completedAt: new Date(),
      },
    });
  }

  const refreshed = await prisma.primaryGoal.findUniqueOrThrow({
    where: { id: goal.id },
    include: { milestones: { orderBy: { orderIndex: "asc" } } },
  });
  return calculateProgress(refreshed.milestones);
}
