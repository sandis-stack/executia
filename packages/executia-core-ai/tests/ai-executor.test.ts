import { beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { runAiExecutor } from "@/core/providers/ai-executor";
import {
  FakeAIProviderAdapter,
  type ProviderCallResult,
} from "@/core/providers/ai-provider-adapter";
import { executeCoreRequest } from "@/core/run-core-execution";
import { ensureConstitutionLoaded } from "@/core/constitution/load";
import type { DevelopmentCellContext } from "@/core/engines/development-cell";
import type { ExecutionSpec, ProviderResponse } from "@/domain/schemas";

const prisma = new PrismaClient();

const cell: DevelopmentCellContext = {
  mission: "Establish EXECUTIA Core AI",
  currentGoal: "Prove AI Executor",
  currentFocus: "Call provider once",
  completedTasks: ["PRE", "Focus", "Cell Loader"],
  remainingTasks: ["POST"],
  lessonsLearned: ["Adapter only"],
  openDecisions: ["No retries in executor"],
  knownRisks: ["Provider outage"],
  nextStep: "Return raw response",
};

function minimalSpec(request: string): ExecutionSpec {
  return {
    constitutionVersion: "core-ai-1.0.0",
    laws: [],
    goalTitle: cell.mission,
    goalDescription: "test",
    currentTask: cell.currentFocus,
    goalAlignment: "DIRECTLY_ALIGNED",
    priorState: null,
    milestones: [],
    constraints: [],
    pendingTasks: [],
    userRequest: request,
    context: { developmentCell: cell },
    outputContract: "ProviderResponseSchema",
  };
}

function ok(parsed: ProviderResponse): ProviderCallResult {
  return {
    ok: true,
    provider: "fake",
    model: "fake-model",
    rawText: JSON.stringify(parsed),
    parsed,
    latencyMs: 1,
    requestPayload: { fake: true },
  };
}

describe("AI Executor (MVP 1.0)", () => {
  it("successful execution → SUCCESS with rawResponse", async () => {
    const parsed: ProviderResponse = {
      response: "Raw success for Establish EXECUTIA Core AI",
      completed: ["Called provider"],
      remaining: ["POST"],
      nextPriorityAction: "Hand off to POST Validation",
      milestoneEvidence: [],
      decisions: [],
    };
    const provider = new FakeAIProviderAdapter(() => ok(parsed));
    const result = await runAiExecutor({
      provider,
      executionId: "exec-1",
      request: "Advance Call provider once for Establish EXECUTIA Core AI",
      mission: { id: "m1", title: cell.mission },
      currentFocus: { label: cell.currentFocus },
      developmentCell: cell,
      spec: minimalSpec("Advance Call provider once for Establish EXECUTIA Core AI"),
    });

    expect(result.status).toBe("SUCCESS");
    expect(result.provider).toBe("fake");
    expect(result.model).toBe("fake-model");
    expect(result.executionId).toBe("exec-1");
    expect(result.rawResponse).toBe(JSON.stringify(parsed));
  });

  it("provider failure → FAILED without retry", async () => {
    let calls = 0;
    const provider = new FakeAIProviderAdapter(() => {
      calls += 1;
      return {
        ok: false,
        provider: "fake",
        model: "fake-model",
        errorMessage: "simulated outage",
        latencyMs: 1,
        requestPayload: {},
      };
    });

    const result = await runAiExecutor({
      provider,
      executionId: "exec-2",
      request: "Advance Call provider once for Establish EXECUTIA Core AI",
      mission: { id: "m1", title: cell.mission },
      currentFocus: { label: cell.currentFocus },
      developmentCell: cell,
      spec: minimalSpec("Advance Call provider once for Establish EXECUTIA Core AI"),
    });

    expect(result.status).toBe("FAILED");
    expect(result.rawResponse).toBeNull();
    expect(calls).toBe(1);
  });
});

describe("AI Executor pipeline gates (MVP 1.0)", () => {
  let goalId = "";
  const goalTitle = "Establish EXECUTIA Core AI";

  beforeAll(async () => {
    await prisma.correctionAttempt.deleteMany();
    await prisma.postValidationResult.deleteMany();
    await prisma.aIExecution.deleteMany();
    await prisma.verifiedResponse.deleteMany();
    await prisma.executionSpecification.deleteMany();
    await prisma.preValidationResult.deleteMany();
    await prisma.completedExecution.deleteMany();
    await prisma.developmentProposal.deleteMany();
    await prisma.decisionRecord.deleteMany();
    await prisma.correctionRecord.deleteMany();
    await prisma.errorRecord.deleteMany();
    await prisma.executionState.deleteMany();
    await prisma.pendingTask.deleteMany();
    await prisma.constraint.deleteMany();
    await prisma.executionRequest.deleteMany();
    await prisma.goalMilestone.deleteMany();
    await prisma.primaryGoal.deleteMany();
    await ensureConstitutionLoaded();

    const goal = await prisma.primaryGoal.create({
      data: {
        title: goalTitle,
        description: "Constitution-governed execution layer",
        currentPhase: "Prove AI Executor",
        milestones: {
          create: [
            {
              title: "Prove AI Executor",
              acceptanceCriteria: "AI runs only after PRE, Focus, Cell",
              weight: 1,
              orderIndex: 0,
              status: "IN_PROGRESS",
            },
          ],
        },
      },
    });
    goalId = goal.id;
  });

  it("AI not called before PRE", async () => {
    let called = 0;
    const provider = new FakeAIProviderAdapter(() => {
      called += 1;
      return ok({
        response: "nope",
        completed: [],
        remaining: [],
        nextPriorityAction: "n/a",
        milestoneEvidence: [],
        decisions: [],
      });
    });

    await executeCoreRequest(
      {
        goalId,
        request: "tell me a joke",
        context: { developmentCell: cell },
      },
      provider,
    );
    expect(called).toBe(0);
  });

  it("AI not called before Focus", async () => {
    let called = 0;
    const provider = new FakeAIProviderAdapter(() => {
      called += 1;
      return ok({
        response: "nope",
        completed: [],
        remaining: [],
        nextPriorityAction: "n/a",
        milestoneEvidence: [],
        decisions: [],
      });
    });

    await executeCoreRequest(
      {
        goalId,
        request: `For ${goalTitle}, switch to an unrelated marketing campaign`,
        context: { developmentCell: cell },
      },
      provider,
    );
    expect(called).toBe(0);
  });

  it("AI not called before Development Cell", async () => {
    let called = 0;
    const provider = new FakeAIProviderAdapter(() => {
      called += 1;
      return ok({
        response: "nope",
        completed: [],
        remaining: [],
        nextPriorityAction: "n/a",
        milestoneEvidence: [],
        decisions: [],
      });
    });

    await executeCoreRequest(
      {
        goalId,
        request: `Advance Prove AI Executor for ${goalTitle}`,
        context: {},
      },
      provider,
    );
    expect(called).toBe(0);
  });
});
