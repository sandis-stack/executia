import type { ExecutionSpec } from "@/domain/schemas";
import type { LoadedConstitution } from "@/core/constitution/laws";
import type { GoalWithMilestones } from "@/core/memory/goal-memory";
import type { LoadedExecutionMemory } from "@/core/memory/execution-memory";
import type { GoalAlignment } from "@/domain/schemas";
import type { InterpretedTask } from "@/core/engines/task-interpreter";
import { ExecutionSpecSchema } from "@/domain/schemas";

export function assembleExecutionContext(input: {
  constitution: LoadedConstitution;
  goal: GoalWithMilestones;
  memory: LoadedExecutionMemory;
  task: InterpretedTask;
  alignment: GoalAlignment;
  userRequest: string;
  context: Record<string, unknown>;
}): ExecutionSpec {
  const spec = {
    constitutionVersion: input.constitution.version,
    laws: input.constitution.laws.map((l) => `${l.name}: ${l.statement}`),
    goalTitle: input.goal.title,
    goalDescription: input.goal.description,
    currentTask: input.task.currentTask,
    goalAlignment: input.alignment,
    priorState: input.memory.priorState
      ? {
          currentObjective: input.memory.priorState.currentObjective,
          completedWork: input.memory.priorState.completedWork,
          remainingWork: input.memory.priorState.remainingWork,
          nextPriorityAction: input.memory.priorState.nextPriorityAction,
        }
      : null,
    milestones: input.goal.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      acceptanceCriteria: m.acceptanceCriteria,
      weight: m.weight,
      status: m.status,
    })),
    constraints: input.memory.constraints,
    pendingTasks: input.memory.pendingTasks.map((t) => t.title),
    userRequest: input.userRequest,
    context: input.context,
    outputContract: "ProviderResponseSchema" as const,
  };
  return ExecutionSpecSchema.parse(spec);
}

export function buildProviderSystemPrompt(spec: ExecutionSpec): string {
  return [
    "You operate under the EXECUTIA Constitution. Obey all laws.",
    `Constitution version: ${spec.constitutionVersion}`,
    ...spec.laws.map((l) => `- ${l}`),
    `Primary goal: ${spec.goalTitle}`,
    `Goal description: ${spec.goalDescription}`,
    `Current task: ${spec.currentTask}`,
    `Goal alignment: ${spec.goalAlignment}`,
    spec.priorState
      ? `Continue from prior approved state. Prior next action was: ${spec.priorState.nextPriorityAction}. Completed: ${spec.priorState.completedWork.join("; ") || "none"}. Remaining: ${spec.priorState.remainingWork.join("; ") || "none"}.`
      : "No prior approved state — establish continuity from this execution.",
    "Milestones (do not invent completion without evidence):",
    ...spec.milestones.map(
      (m) =>
        `- [${m.status}] w=${m.weight} ${m.title} (id=${m.id}): ${m.acceptanceCriteria}`,
    ),
    "Constraints:",
    ...(spec.constraints.length
      ? spec.constraints.map((c) => `- ${c}`)
      : ["- (none)"]),
    "Return ONLY JSON:",
    '{ "response": string, "completed": string[], "remaining": string[], "nextPriorityAction": string, "milestoneEvidence": [{ "milestoneId"?: string, "milestoneTitle"?: string, "evidence": string, "markComplete"?: boolean }], "decisions": string[] }',
    "Do not invent progress percentages. Do not abandon the primary goal.",
  ].join("\n");
}
