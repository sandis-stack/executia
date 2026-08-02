import { z } from "zod";

export const DevelopmentCellSchema = z.object({
  mission: z.string().min(1),
  currentGoal: z.string().min(1),
  currentFocus: z.string().min(1),
  completedTasks: z.array(z.string()),
  remainingTasks: z.array(z.string()),
  lessonsLearned: z.array(z.string()),
  openDecisions: z.array(z.string()),
  knownRisks: z.array(z.string()),
  nextStep: z.string().min(1),
});

export const ExecuteRequestSchema = z.object({
  mission: z.string().min(1),
  currentGoal: z.string().min(1),
  currentFocus: z.string().min(1),
  developmentCell: DevelopmentCellSchema,
  permissions: z.object({
    aiExecutionAllowed: z.boolean(),
  }),
  userRequest: z.string().min(1),
});

export type ExecuteRequest = z.infer<typeof ExecuteRequestSchema>;

export type PipelineStatus = {
  preValidation: string;
  focusValidation: string;
  developmentCell: string;
  aiExecutor: string;
  postValidation: string | null;
};

export type ExecuteApiResponse = {
  executionId: string;
  status: string;
  mission: string;
  completedPercent: number | null;
  remainingPercent: number | null;
  currentFocus: string;
  nextStep: string;
  response: string;
  pipeline: PipelineStatus;
};
