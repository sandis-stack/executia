import type {
  CoreRequest,
  GoalAlignment,
  VerifiedCoreResponse,
} from "@/domain/schemas";
import { requireConstitution } from "@/core/constitution/load";
import { assembleExecutionContext } from "@/core/engines/context-assembler";
import {
  applyDevelopmentUpdate,
  loadDevelopmentCell,
  runDevelopmentCell,
} from "@/core/engines/development-cell";
import type { DevelopmentCellContext } from "@/core/engines/development-cell";
import {
  createExecutionRequest,
  recordAIExecution,
  recordPostValidation,
  recordPreValidation,
  recordSpecification,
  recordVerifiedResponse,
  setExecutionStatus,
} from "@/core/engines/execution-ledger";
import { classifyGoalAlignment, validateFocus } from "@/core/engines/focus-engine";
import { evaluatePreLaws } from "@/core/engines/law-engine";
import { runPostValidation } from "@/core/engines/post-validation-engine";
import { preValidate } from "@/core/engines/pre-validation-engine";
import {
  applyMilestoneEvidence,
  calculateExecutionProgress,
  calculateProgress,
} from "@/core/engines/progress-engine";
import { interpretTask } from "@/core/engines/task-interpreter";
import { deliverThroughResponseGate } from "@/core/gate/response-gate";
import {
  loadExecutionMemory,
  recordErrorMemory,
  updateMemoryAfterApproval,
} from "@/core/memory/execution-memory";
import { loadPrimaryGoal } from "@/core/memory/goal-memory";
import type { AIProviderAdapter } from "@/core/providers/ai-provider-adapter";
import { runAiExecutor } from "@/core/providers/ai-executor";
import { buildExecutiaReport, buildUserResponse } from "@/core/report/report-builder";

async function finalizeBlocked(input: {
  executionId: string;
  goalTitle: string;
  currentTask: string;
  alignment: GoalAlignment;
  preValidation: VerifiedCoreResponse["executiaReport"]["preValidation"];
  postValidation: VerifiedCoreResponse["executiaReport"]["postValidation"];
  message: string;
  status: string;
  progress: ReturnType<typeof calculateProgress>;
  completed?: string[];
  remaining?: string[];
  nextPriorityAction?: string;
  developmentCell: VerifiedCoreResponse["executiaReport"]["developmentCell"];
  rawProviderText?: string | null;
  constitutionVersionId: string;
  goalId: string;
}): Promise<VerifiedCoreResponse> {
  const report = buildExecutiaReport({
    primaryGoal: input.goalTitle,
    currentTask: input.currentTask || "unidentified",
    goalAlignment: input.alignment,
    executionStatus: input.status,
    overallProgressPercent: input.progress.overallProgressPercent,
    taskProgressPercent: input.progress.taskProgressPercent,
    progressStatus: input.progress.progressStatus,
    completed: input.completed ?? [],
    remaining: input.remaining ?? ["Resolve blocked conditions"],
    preValidation: input.preValidation,
    postValidation: input.postValidation,
    nextPriorityAction:
      input.nextPriorityAction ??
      "Align the next request with the primary goal.",
    developmentCell: input.developmentCell,
  });

  await recordVerifiedResponse({
    executionId: input.executionId,
    status:
      input.status === "PROVIDER_FAILED"
        ? "PROVIDER_FAILED"
        : input.status === "CLARIFICATION_REQUIRED"
          ? "CLARIFICATION_REQUIRED"
          : input.preValidation === "BLOCKED"
            ? "PRE_BLOCKED"
            : "BLOCKED",
    responseText: input.message,
    report,
    ledgerOk: true,
  });

  return deliverThroughResponseGate({
    response: input.message,
    report,
    executionId: input.executionId,
    rawProviderText: input.rawProviderText,
    ledgerOk: true,
    blockedDelivery: true,
  });
}

/**
 * EXECUTIA Core AI vertical.
 * Public user-facing return ONLY via ResponseGate.
 */
export async function executeCoreRequest(
  input: CoreRequest,
  provider: AIProviderAdapter,
  options?: { skipConstitutionLoad?: boolean },
): Promise<VerifiedCoreResponse> {
  // 1. Constitution — required before AI
  let constitution;
  if (options?.skipConstitutionLoad) {
    constitution = null;
  } else {
    constitution = await requireConstitution();
  }

  if (!constitution) {
    throw new Error(
      "EXECUTIA Constitution not loaded — AI execution cannot occur.",
    );
  }

  // 2. Goal + memory
  const goal = await loadPrimaryGoal(input.goalId);
  if (!goal || goal.status !== "ACTIVE") {
    // Need an execution id for gate/ledger — create orphan blocked path via temp goal error
    throw new Error("Primary goal missing or inactive — execution blocked.");
  }

  const memory = await loadExecutionMemory(goal.id);
  const alignment = classifyGoalAlignment(input.request, goal);
  const task = interpretTask(input.request, goal, memory);
  const progressSnapshot = calculateProgress(goal.milestones);

  const lawPre = evaluatePreLaws({
    constitution,
    goalLoaded: true,
    alignment,
    memoryLoaded: memory.loaded,
  });

  const execution = await createExecutionRequest({
    goalId: goal.id,
    constitutionVersionId: constitution.dbId,
    requestText: input.request,
    context: input.context,
    currentTask: task.currentTask,
    goalAlignment: alignment,
  });

  // PRE Validation — independent gate; AI Executor must not run on BLOCK
  const pre = preValidate({
    mission: { id: goal.id, title: goal.title },
    currentFocus: { label: task.currentTask },
    developmentCell: { loaded: true },
    permissions: {
      available: lawPre.ok,
      canExecute: lawPre.ok,
    },
    request: input.request,
    requestAllowed: alignment !== "CONFLICTING",
  });

  await recordPreValidation(execution.id, {
    status: pre.status,
    reasons: pre.reasons,
  });

  if (pre.blocked || pre.status === "BLOCKED") {
    await setExecutionStatus(execution.id, "PRE_BLOCKED");
    await recordErrorMemory({
      goalId: goal.id,
      executionId: execution.id,
      message: pre.reasons.join(" "),
      stage: "pre-validation",
    });
    const cell = await runDevelopmentCell({
      constitutionVersionId: constitution.dbId,
      goalId: goal.id,
      executionId: execution.id,
      post: null,
      warnings: [],
      approved: false,
    });
    return finalizeBlocked({
      executionId: execution.id,
      goalTitle: goal.title,
      currentTask: task.currentTask,
      alignment,
      preValidation: "BLOCKED",
      postValidation: null,
      message: `BLOCKED: ${pre.reasons.join(" ")}`,
      status: "BLOCKED",
      progress: progressSnapshot,
      developmentCell: cell,
      constitutionVersionId: constitution.dbId,
      goalId: goal.id,
    });
  }

  // Focus Validator — only after PRE APPROVED; no AI on NEEDS_CLARIFICATION / REJECTED
  const focus = validateFocus({
    request: input.request,
    mission: {
      id: goal.id,
      title: goal.title,
      description: goal.description,
    },
    currentFocus: { label: task.currentTask },
  });

  if (focus.status !== "APPROVED") {
    const stopStatus =
      focus.status === "NEEDS_CLARIFICATION"
        ? "CLARIFICATION_REQUIRED"
        : "BLOCKED";
    await setExecutionStatus(execution.id, stopStatus);
    await recordErrorMemory({
      goalId: goal.id,
      executionId: execution.id,
      message: focus.reason,
      stage: "focus-validation",
    });
    // Do not update Development Cell; do not call AI Executor
    return finalizeBlocked({
      executionId: execution.id,
      goalTitle: goal.title,
      currentTask: task.currentTask,
      alignment,
      preValidation: "APPROVED",
      postValidation: null,
      message: `${focus.status}: ${focus.reason}`,
      status: stopStatus,
      progress: progressSnapshot,
      developmentCell: {
        finding:
          "Pipeline stopped at Focus Validator — Development Cell not updated.",
        proposal: null,
        status: "NO_CHANGE",
      },
      nextPriorityAction:
        focus.status === "NEEDS_CLARIFICATION"
          ? "Clarify the request against the active Mission and Current Focus."
          : "Submit a request that supports the active Mission and Current Focus.",
      constitutionVersionId: constitution.dbId,
      goalId: goal.id,
    });
  }

  // Development Cell Loader — only after PRE and Focus APPROVED
  const cellSource =
    input.context.developmentCell !== undefined
      ? (input.context.developmentCell as DevelopmentCellContext | null)
      : null;
  const cellLoad = loadDevelopmentCell(cellSource);

  if (cellLoad.status === "BLOCKED") {
    await setExecutionStatus(execution.id, "BLOCKED");
    await recordErrorMemory({
      goalId: goal.id,
      executionId: execution.id,
      message: cellLoad.reason,
      stage: "development-cell-loader",
    });
    // Do not create/infer cell data; do not update cell; do not call AI
    return finalizeBlocked({
      executionId: execution.id,
      goalTitle: goal.title,
      currentTask: task.currentTask,
      alignment,
      preValidation: "APPROVED",
      postValidation: null,
      message: `BLOCKED: ${cellLoad.reason}`,
      status: "BLOCKED",
      progress: progressSnapshot,
      developmentCell: {
        finding:
          "Pipeline stopped at Development Cell Loader — Development Cell not updated.",
        proposal: null,
        status: "NO_CHANGE",
      },
      nextPriorityAction:
        "Provide a complete Development Cell before execution can continue.",
      constitutionVersionId: constitution.dbId,
      goalId: goal.id,
    });
  }

  // Provider must not be called without constitution (already enforced)
  const effectiveRequest = input.request;
  const spec = assembleExecutionContext({
    constitution,
    goal,
    memory,
    task,
    alignment,
    userRequest: effectiveRequest,
    context: {
      ...input.context,
      developmentCell: cellLoad.developmentCell,
    },
  });
  await recordSpecification(execution.id, spec);
  await setExecutionStatus(execution.id, "RUNNING");

  // AI Executor — single call (no automatic retry)
  const aiResult = await runAiExecutor({
    provider,
    executionId: execution.id,
    request: effectiveRequest,
    mission: {
      id: goal.id,
      title: goal.title,
      description: goal.description,
    },
    currentFocus: { label: task.currentTask },
    developmentCell: cellLoad.developmentCell!,
    spec,
  });
  const call = aiResult.transport;
  await recordAIExecution({
    executionId: execution.id,
    provider: aiResult.provider,
    model: aiResult.model,
    attemptIndex: 0,
    requestPayload: call.requestPayload,
    rawResponse: aiResult.rawResponse ?? undefined,
    parsed: call.ok ? call.parsed : null,
    errorMessage: call.ok ? undefined : call.errorMessage,
    latencyMs: call.latencyMs,
  });

  if (aiResult.status === "FAILED" || !call.ok) {
    const failMessage = !call.ok ? call.errorMessage : "AI Executor failed.";
    await setExecutionStatus(execution.id, "PROVIDER_FAILED");
    await recordErrorMemory({
      goalId: goal.id,
      executionId: execution.id,
      message: failMessage,
      stage: "provider",
    });
    return finalizeBlocked({
      executionId: execution.id,
      goalTitle: goal.title,
      currentTask: task.currentTask,
      alignment,
      preValidation: pre.status,
      postValidation: null,
      message: `Provider failure. Delivery blocked. ${failMessage}`,
      status: "PROVIDER_FAILED",
      progress: progressSnapshot,
      developmentCell: {
        finding: "AI Executor failed — Development Cell not updated.",
        proposal: null,
        status: "NO_CHANGE",
      },
      rawProviderText: call.rawText,
      constitutionVersionId: constitution.dbId,
      goalId: goal.id,
      nextPriorityAction: "Retry after provider health is restored.",
    });
  }

  if (!call.ok || !call.parsed) {
    throw new Error("AI Executor returned SUCCESS without parsed payload.");
  }
  const parsed = call.parsed;

  // POST Validation
  const mvpPost = runPostValidation({
    aiResponse: parsed.response,
    parsed,
    mission: { title: goal.title },
    currentFocus: { label: task.currentTask },
    developmentCell: cellLoad.developmentCell!,
    rawText: call.rawText,
  });
  await recordPostValidation(execution.id, 0, {
    status: mvpPost.status === "APPROVED" ? "APPROVED" : "BLOCKED",
    reasons: [mvpPost.reason],
    warnings: [],
  });

  if (mvpPost.status === "REJECTED") {
    await setExecutionStatus(execution.id, "BLOCKED");
    await recordErrorMemory({
      goalId: goal.id,
      executionId: execution.id,
      message: mvpPost.reason,
      stage: "post-validation",
    });
    // Do not calculate progress, update Development Cell, or build User Response
    return finalizeBlocked({
      executionId: execution.id,
      goalTitle: goal.title,
      currentTask: task.currentTask,
      alignment,
      preValidation: pre.status,
      postValidation: "BLOCKED",
      message: `REJECTED: ${mvpPost.reason}`,
      status: "BLOCKED",
      progress: progressSnapshot,
      completed: parsed.completed,
      remaining: parsed.remaining,
      developmentCell: {
        finding:
          "Pipeline stopped at POST Validation — Development Cell not updated.",
        proposal: null,
        status: "NO_CHANGE",
      },
      rawProviderText: call.rawText,
      constitutionVersionId: constitution.dbId,
      goalId: goal.id,
      nextPriorityAction:
        "Revise the AI-facing request so POST Validation can approve.",
    });
  }

  // Progress Calculator — only after POST APPROVED
  const executionProgress = calculateExecutionProgress({
    developmentCell: cellLoad.developmentCell!,
    completedFromAi: parsed.completed,
    remainingFromAi: parsed.remaining,
    currentFocus: task.currentTask,
    nextStep: parsed.nextPriorityAction,
  });

  // Development Update — only after POST APPROVED
  const updatedCell = applyDevelopmentUpdate({
    developmentCell: cellLoad.developmentCell!,
    completedTasks: parsed.completed,
    remainingTasks: parsed.remaining,
    lessonsLearned: [],
    nextStep: parsed.nextPriorityAction,
  });

  const milestoneProgress = await applyMilestoneEvidence(goal, parsed);
  await updateMemoryAfterApproval({
    goalId: goal.id,
    executionId: execution.id,
    currentObjective: task.currentTask,
    completedWork: updatedCell.completedTasks,
    remainingWork: updatedCell.remainingTasks,
    nextPriorityAction: updatedCell.nextStep,
    decisions: parsed.decisions,
    summary: parsed.response.slice(0, 500),
  });

  const cellReport = await runDevelopmentCell({
    constitutionVersionId: constitution.dbId,
    goalId: goal.id,
    executionId: execution.id,
    post: {
      status: "APPROVED",
      reasons: [mvpPost.reason],
      warnings: [],
    },
    warnings: [],
    approved: true,
  });

  // User Response — formatting only, after POST APPROVED
  const userFacing = buildUserResponse({
    mission: goal.title,
    status: "APPROVED",
    progress: executionProgress,
    aiResponse: parsed.response,
  });

  await setExecutionStatus(execution.id, "APPROVED");

  const report = buildExecutiaReport({
    primaryGoal: goal.title,
    currentTask: task.currentTask,
    goalAlignment: alignment,
    executionStatus: "APPROVED",
    overallProgressPercent: milestoneProgress.overallProgressPercent,
    taskProgressPercent: milestoneProgress.taskProgressPercent,
    progressStatus: milestoneProgress.progressStatus,
    completed: updatedCell.completedTasks,
    remaining: updatedCell.remainingTasks,
    preValidation: pre.status,
    postValidation: "APPROVED",
    nextPriorityAction: updatedCell.nextStep,
    developmentCell: cellReport,
  });

  await recordVerifiedResponse({
    executionId: execution.id,
    status: "APPROVED",
    responseText: userFacing,
    report,
    ledgerOk: true,
  });

  return deliverThroughResponseGate({
    response: userFacing,
    report,
    executionId: execution.id,
    rawProviderText: call.rawText,
    ledgerOk: true,
    blockedDelivery: false,
  });
}

/** Internal-only export surface for tests proving gate exclusivity. */
export const CORE_PUBLIC_DELIVERY = "ResponseGate" as const;
