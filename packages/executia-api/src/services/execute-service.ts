import {
  executeCoreRequest,
  type AIProviderAdapter,
  type VerifiedCoreResponse,
} from "@executia/core-ai";
import { ensureMissionGoal, resolveEnforcedMissionTitle } from "./goal";
import { httpStatusForCoreResult, mapCoreResult } from "./map-response";
import type { ExecuteApiResponse, ExecuteRequest } from "./schemas";

export type ExecuteServiceResult = {
  httpStatus: number;
  body: ExecuteApiResponse;
  core: VerifiedCoreResponse;
};

/**
 * Always executes through EXECUTIA Core.
 * OpenAI is reachable only via the provider adapter passed into Core's AI Executor.
 */
export async function runExecute(
  body: ExecuteRequest,
  provider: AIProviderAdapter,
): Promise<ExecuteServiceResult> {
  if (!body.permissions.aiExecutionAllowed) {
    const blocked: VerifiedCoreResponse = {
      response:
        "BLOCKED: permissions.aiExecutionAllowed is false — AI Executor not invoked.",
      executiaReport: {
        primaryGoal: body.mission,
        currentTask: body.currentFocus,
        goalAlignment: "NEUTRAL",
        executionStatus: "BLOCKED",
        overallProgressPercent: null,
        taskProgressPercent: null,
        progressStatus: "NOT_MEASURABLE",
        completed: [],
        remaining: ["Enable aiExecutionAllowed to continue"],
        preValidation: "BLOCKED",
        postValidation: null,
        nextPriorityAction: "Set permissions.aiExecutionAllowed to true.",
        developmentCell: {
          finding: "AI execution permission denied at API boundary.",
          proposal: null,
          status: "NO_CHANGE",
        },
      },
      executionId: "permission-denied",
      deliveredBy: "ResponseGate",
    };
    return {
      httpStatus: 409,
      body: mapCoreResult(blocked),
      core: blocked,
    };
  }

  const goal = await ensureMissionGoal({
    mission: body.mission,
    currentGoal: body.currentGoal,
    currentFocus: body.currentFocus,
  });

  // Core POST Validation requires the AI response (or nextPriorityAction) to
  // contain the full PrimaryGoal title. Keep that check unchanged; ensure the
  // Core-bound request states the mission title that must appear in the answer.
  const request = buildCoreBoundRequest(body);

  const core = await executeCoreRequest(
    {
      goalId: goal.id,
      request,
      context: {
        developmentCell: body.developmentCell,
        mission: body.mission,
        currentGoal: body.currentGoal,
        currentFocus: body.currentFocus,
      },
    },
    provider,
  );

  return {
    httpStatus: httpStatusForCoreResult(core),
    body: mapCoreResult(core),
    core,
  };
}

/**
 * Build the request text passed into EXECUTIA Core.
 * Does not invent AI content; states the enforceable mission title Core POST checks.
 */
export function buildCoreBoundRequest(body: ExecuteRequest): string {
  const enforcedTitle = resolveEnforcedMissionTitle(body.mission);
  return [
    body.userRequest.trim(),
    `Mission title (include this exact phrase verbatim in the JSON "response" field): ${enforcedTitle}`,
  ].join("\n\n");
}
