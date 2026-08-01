import { z } from "zod";

export const GoalAlignmentSchema = z.enum([
  "DIRECTLY_ALIGNED",
  "SUPPORTING",
  "NEUTRAL",
  "CONFLICTING",
]);
export type GoalAlignment = z.infer<typeof GoalAlignmentSchema>;

export const PreValidationStatusSchema = z.enum([
  "APPROVED",
  "CORRECTED",
  "REQUIRES_CLARIFICATION",
  "BLOCKED",
]);
export type PreValidationStatus = z.infer<typeof PreValidationStatusSchema>;

export const PostValidationStatusSchema = z.enum([
  "APPROVED",
  "APPROVED_WITH_WARNINGS",
  "REQUIRES_CORRECTION",
  "BLOCKED",
]);
export type PostValidationStatus = z.infer<typeof PostValidationStatusSchema>;

export const DevelopmentCellStatusSchema = z.enum([
  "NO_CHANGE",
  "PROPOSED",
  "REQUIRES_APPROVAL",
]);
export type DevelopmentCellStatus = z.infer<typeof DevelopmentCellStatusSchema>;

export const ExecutionStatusSchema = z.enum([
  "PENDING",
  "PRE_BLOCKED",
  "CLARIFICATION_REQUIRED",
  "RUNNING",
  "APPROVED",
  "APPROVED_WITH_WARNINGS",
  "BLOCKED",
  "PROVIDER_FAILED",
]);
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export const ProgressStatusSchema = z.enum(["MEASURABLE", "NOT_MEASURABLE"]);
export type ProgressStatus = z.infer<typeof ProgressStatusSchema>;

export const CoreRequestSchema = z.object({
  goalId: z.string().min(1),
  request: z.string().min(1),
  context: z.record(z.string(), z.unknown()).default({}),
});
export type CoreRequest = z.infer<typeof CoreRequestSchema>;

export const ProviderResponseSchema = z.object({
  response: z.string().min(1),
  completed: z.array(z.string()).default([]),
  remaining: z.array(z.string()).default([]),
  nextPriorityAction: z.string().min(1),
  milestoneEvidence: z
    .array(
      z.object({
        milestoneId: z.string().optional(),
        milestoneTitle: z.string().optional(),
        evidence: z.string().min(1),
        markComplete: z.boolean().optional(),
      }),
    )
    .default([]),
  decisions: z.array(z.string()).default([]),
});
export type ProviderResponse = z.infer<typeof ProviderResponseSchema>;

export const DevelopmentCellReportSchema = z.object({
  finding: z.string().min(1),
  proposal: z.string().nullable(),
  status: DevelopmentCellStatusSchema,
});
export type DevelopmentCellReport = z.infer<typeof DevelopmentCellReportSchema>;

export const ExecutiaReportSchema = z.object({
  primaryGoal: z.string().min(1),
  currentTask: z.string().min(1),
  goalAlignment: GoalAlignmentSchema,
  executionStatus: z.string().min(1),
  overallProgressPercent: z.number().int().min(0).max(100).nullable(),
  taskProgressPercent: z.number().int().min(0).max(100).nullable(),
  progressStatus: ProgressStatusSchema.optional(),
  completed: z.array(z.string()),
  remaining: z.array(z.string()),
  preValidation: PreValidationStatusSchema,
  postValidation: PostValidationStatusSchema.nullable(),
  nextPriorityAction: z.string().min(1),
  developmentCell: DevelopmentCellReportSchema,
});
export type ExecutiaReport = z.infer<typeof ExecutiaReportSchema>;

export const VerifiedCoreResponseSchema = z.object({
  response: z.string(),
  executiaReport: ExecutiaReportSchema,
  executionId: z.string().optional(),
  deliveredBy: z.literal("ResponseGate"),
});
export type VerifiedCoreResponse = z.infer<typeof VerifiedCoreResponseSchema>;

export const ExecutionSpecSchema = z.object({
  constitutionVersion: z.string(),
  laws: z.array(z.string()),
  goalTitle: z.string(),
  goalDescription: z.string(),
  currentTask: z.string(),
  goalAlignment: GoalAlignmentSchema,
  priorState: z
    .object({
      currentObjective: z.string(),
      completedWork: z.array(z.string()),
      remainingWork: z.array(z.string()),
      nextPriorityAction: z.string(),
    })
    .nullable(),
  milestones: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      acceptanceCriteria: z.string(),
      weight: z.number(),
      status: z.string(),
    }),
  ),
  constraints: z.array(z.string()),
  pendingTasks: z.array(z.string()),
  userRequest: z.string(),
  context: z.record(z.string(), z.unknown()),
  outputContract: z.literal("ProviderResponseSchema"),
});
export type ExecutionSpec = z.infer<typeof ExecutionSpecSchema>;
