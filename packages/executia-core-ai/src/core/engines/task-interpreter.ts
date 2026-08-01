import type { LoadedExecutionMemory } from "@/core/memory/execution-memory";
import type { GoalWithMilestones } from "@/core/memory/goal-memory";

export type InterpretedTask = {
  currentTask: string;
  continuesFromPrior: boolean;
  priorNextAction: string | null;
};

/**
 * CONTINUITY LAW: continue from latest approved state when present.
 */
export function interpretTask(
  request: string,
  goal: GoalWithMilestones,
  memory: LoadedExecutionMemory,
): InterpretedTask {
  if (memory.priorState) {
    return {
      currentTask: `${memory.priorState.currentObjective} — continuing: ${request.trim()}`,
      continuesFromPrior: true,
      priorNextAction: memory.priorState.nextPriorityAction,
    };
  }

  const inProgress = goal.milestones.find((m) => m.status === "IN_PROGRESS");
  const pending = goal.milestones.find((m) => m.status === "PENDING");
  const phase = inProgress?.title ?? pending?.title ?? goal.currentPhase;

  return {
    currentTask: `${phase}: ${request.trim()}`,
    continuesFromPrior: false,
    priorNextAction: null,
  };
}
