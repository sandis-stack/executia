import {
  ExecutiaReportSchema,
  type DevelopmentCellReport,
  type ExecutiaReport,
  type GoalAlignment,
  type PostValidationStatus,
  type PreValidationStatus,
  type ProgressStatus,
} from "@/domain/schemas";
import type { ExecutionProgress } from "@/core/engines/progress-engine";

/**
 * User Response (MVP 1.0) — formatting only.
 * No validation, calculations, or Development updates.
 */
export function buildUserResponse(input: {
  mission: string;
  status: string;
  progress: ExecutionProgress;
  aiResponse: string;
}): string {
  return [
    "MISSION",
    input.mission,
    "STATUS BAR",
    `Status: ${input.status}`,
    `Completed %: ${input.progress.completedPercent}`,
    `Remaining %: ${input.progress.remainingPercent}`,
    `Current Focus: ${input.progress.currentFocus}`,
    `Next Step: ${input.progress.nextStep}`,
    "",
    input.aiResponse,
  ].join("\n");
}

export function buildExecutiaReport(input: {
  primaryGoal: string;
  currentTask: string;
  goalAlignment: GoalAlignment;
  executionStatus: string;
  overallProgressPercent: number | null;
  taskProgressPercent: number | null;
  progressStatus: ProgressStatus;
  completed: string[];
  remaining: string[];
  preValidation: PreValidationStatus;
  postValidation: PostValidationStatus | null;
  nextPriorityAction: string;
  developmentCell: DevelopmentCellReport;
}): ExecutiaReport {
  const report = {
    primaryGoal: input.primaryGoal,
    currentTask: input.currentTask,
    goalAlignment: input.goalAlignment,
    executionStatus: input.executionStatus,
    overallProgressPercent:
      input.progressStatus === "NOT_MEASURABLE"
        ? null
        : input.overallProgressPercent,
    taskProgressPercent:
      input.progressStatus === "NOT_MEASURABLE"
        ? null
        : input.taskProgressPercent,
    progressStatus: input.progressStatus,
    completed: input.completed,
    remaining: input.remaining,
    preValidation: input.preValidation,
    postValidation: input.postValidation,
    nextPriorityAction: input.nextPriorityAction,
    developmentCell: input.developmentCell,
  };
  return ExecutiaReportSchema.parse(report);
}
