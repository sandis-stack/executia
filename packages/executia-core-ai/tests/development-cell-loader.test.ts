import { beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  loadDevelopmentCell,
  type DevelopmentCellContext,
} from "@/core/engines/development-cell";
import { executeCoreRequest } from "@/core/run-core-execution";
import { ensureConstitutionLoaded } from "@/core/constitution/load";
import {
  FakeAIProviderAdapter,
  type ProviderCallResult,
} from "@/core/providers/ai-provider-adapter";
import type { ProviderResponse } from "@/domain/schemas";

const prisma = new PrismaClient();

export function completeCell(
  overrides: Partial<DevelopmentCellContext> = {},
): DevelopmentCellContext {
  return {
    mission: "Establish EXECUTIA Core AI",
    currentGoal: "Ship Development Cell Loader",
    currentFocus: "Prove Development Cell Loader",
    completedTasks: ["PRE Validation", "Focus Validator"],
    remainingTasks: ["AI Executor"],
    lessonsLearned: ["Fail closed before AI"],
    openDecisions: ["Keep loader independent"],
    knownRisks: ["Missing cell blocks execution"],
    nextStep: "Pass loaded cell to AI Executor",
    ...overrides,
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

describe("Development Cell Loader (MVP 1.0)", () => {
  it("complete Development Cell → LOADED", () => {
    const cell = completeCell();
    const result = loadDevelopmentCell(cell);
    expect(result.status).toBe("LOADED");
    expect(result.developmentCell).toBe(cell);
    expect(result.missingFields).toEqual([]);
  });

  it("Development Cell missing → BLOCKED", () => {
    const result = loadDevelopmentCell(null);
    expect(result.status).toBe("BLOCKED");
    expect(result.developmentCell).toBeNull();
    expect(result.missingFields).toContain("developmentCell");
  });

  it("Missing Mission → BLOCKED", () => {
    const result = loadDevelopmentCell(completeCell({ mission: "" }));
    expect(result.status).toBe("BLOCKED");
    expect(result.missingFields).toContain("mission");
  });

  it("Missing Current Goal → BLOCKED", () => {
    const result = loadDevelopmentCell(
      completeCell({ currentGoal: "   " }),
    );
    expect(result.status).toBe("BLOCKED");
    expect(result.missingFields).toContain("currentGoal");
  });

  it("Missing Current Focus → BLOCKED", () => {
    const result = loadDevelopmentCell(
      completeCell({ currentFocus: "" }),
    );
    expect(result.status).toBe("BLOCKED");
    expect(result.missingFields).toContain("currentFocus");
  });

  it("Missing Completed Tasks → BLOCKED", () => {
    const cell = completeCell();
    delete (cell as { completedTasks?: string[] }).completedTasks;
    const result = loadDevelopmentCell(cell);
    expect(result.status).toBe("BLOCKED");
    expect(result.missingFields).toContain("completedTasks");
  });

  it("Missing Remaining Tasks → BLOCKED", () => {
    const cell = completeCell();
    delete (cell as { remainingTasks?: string[] }).remainingTasks;
    const result = loadDevelopmentCell(cell);
    expect(result.status).toBe("BLOCKED");
    expect(result.missingFields).toContain("remainingTasks");
  });

  it("Missing Lessons Learned → BLOCKED", () => {
    const cell = completeCell();
    delete (cell as { lessonsLearned?: string[] }).lessonsLearned;
    const result = loadDevelopmentCell(cell);
    expect(result.status).toBe("BLOCKED");
    expect(result.missingFields).toContain("lessonsLearned");
  });

  it("Missing Open Decisions → BLOCKED", () => {
    const cell = completeCell();
    delete (cell as { openDecisions?: string[] }).openDecisions;
    const result = loadDevelopmentCell(cell);
    expect(result.status).toBe("BLOCKED");
    expect(result.missingFields).toContain("openDecisions");
  });

  it("Missing Known Risks → BLOCKED", () => {
    const cell = completeCell();
    delete (cell as { knownRisks?: string[] }).knownRisks;
    const result = loadDevelopmentCell(cell);
    expect(result.status).toBe("BLOCKED");
    expect(result.missingFields).toContain("knownRisks");
  });

  it("Missing Next Step → BLOCKED", () => {
    const result = loadDevelopmentCell(completeCell({ nextStep: "" }));
    expect(result.status).toBe("BLOCKED");
    expect(result.missingFields).toContain("nextStep");
  });

  it("Loaded data is not modified", () => {
    const cell = completeCell({
      completedTasks: ["A"],
      remainingTasks: ["B"],
    });
    const snapshot = structuredClone(cell);
    const result = loadDevelopmentCell(cell);
    expect(result.status).toBe("LOADED");
    expect(result.developmentCell).toBe(cell);
    expect(cell).toEqual(snapshot);
  });
});

describe("Development Cell Loader pipeline (MVP 1.0)", () => {
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
        currentPhase: "Prove Development Cell Loader",
        milestones: {
          create: [
            {
              title: "Prove Development Cell Loader",
              acceptanceCriteria: "Loader blocks AI when cell incomplete",
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

  it("AI Executor is not called after BLOCKED", async () => {
    let called = 0;
    const provider = new FakeAIProviderAdapter(() => {
      called += 1;
      return ok({
        response: "should not run",
        completed: [],
        remaining: [],
        nextPriorityAction: "n/a",
        milestoneEvidence: [],
        decisions: [],
      });
    });

    const result = await executeCoreRequest(
      {
        goalId,
        request: `Advance Prove Development Cell Loader for ${goalTitle}`,
        context: {},
      },
      provider,
    );

    expect(called).toBe(0);
    expect(result.executiaReport.preValidation).toBe("APPROVED");
    expect(result.executiaReport.executionStatus).toBe("BLOCKED");
    expect(result.response).toContain("Development Cell");
  });

  it("Loader runs only after PRE and Focus are APPROVED", async () => {
    let called = 0;
    const provider = new FakeAIProviderAdapter(() => {
      called += 1;
      return ok({
        response: "should not run",
        completed: [],
        remaining: [],
        nextPriorityAction: "n/a",
        milestoneEvidence: [],
        decisions: [],
      });
    });

    // PRE blocks first — loader must not be the stop reason
    const preBlocked = await executeCoreRequest(
      { goalId, request: "tell me a joke", context: {} },
      provider,
    );
    expect(called).toBe(0);
    expect(preBlocked.executiaReport.preValidation).toBe("BLOCKED");
    expect(preBlocked.response).not.toContain("Development Cell Loader");

    // Focus rejects — loader must not be the stop reason
    const focusRejected = await executeCoreRequest(
      {
        goalId,
        request: `For ${goalTitle}, switch to an unrelated marketing campaign`,
        context: {},
      },
      provider,
    );
    expect(called).toBe(0);
    expect(focusRejected.executiaReport.preValidation).toBe("APPROVED");
    expect(focusRejected.response).toContain("REJECTED");
    expect(focusRejected.response).not.toContain(
      "Development Cell does not exist",
    );

    // PRE + Focus APPROVED, missing cell → loader BLOCKED
    const cellBlocked = await executeCoreRequest(
      {
        goalId,
        request: `Advance Prove Development Cell Loader for ${goalTitle}`,
        context: {},
      },
      provider,
    );
    expect(called).toBe(0);
    expect(cellBlocked.executiaReport.preValidation).toBe("APPROVED");
    expect(cellBlocked.response).toContain("Development Cell does not exist");
  });
});
