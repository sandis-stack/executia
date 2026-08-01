import { beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { validateFocus } from "@/core/engines/focus-engine";
import { executeCoreRequest } from "@/core/run-core-execution";
import { ensureConstitutionLoaded } from "@/core/constitution/load";
import {
  FakeAIProviderAdapter,
  type ProviderCallResult,
} from "@/core/providers/ai-provider-adapter";
import type { ProviderResponse } from "@/domain/schemas";

const prisma = new PrismaClient();

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

describe("Focus Validator (MVP 1.0)", () => {
  const mission = {
    id: "mission-1",
    title: "Establish EXECUTIA Core AI",
    description: "Constitution-governed execution layer",
  };
  const currentFocus = {
    label: "Prove Focus Validator for Establish EXECUTIA Core AI",
  };

  it("directly aligned request → APPROVED", () => {
    const result = validateFocus({
      request:
        "Advance Prove Focus Validator for Establish EXECUTIA Core AI with concrete next steps",
      mission,
      currentFocus,
    });
    expect(result.status).toBe("APPROVED");
    expect(result.missionRespected).toBe(true);
    expect(result.focusMaintained).toBe(true);
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it("request missing necessary information → NEEDS_CLARIFICATION", () => {
    const result = validateFocus({
      request: "What about Establish EXECUTIA Core AI?",
      mission,
      currentFocus,
    });
    expect(result.status).toBe("NEEDS_CLARIFICATION");
    expect(result.missionRespected).toBe(true);
    expect(result.focusMaintained).toBe(false);
  });

  it("unrelated request → REJECTED", () => {
    const result = validateFocus({
      request: "tell me a joke",
      mission,
      currentFocus,
    });
    expect(result.status).toBe("REJECTED");
    expect(result.missionRespected).toBe(false);
    expect(result.focusMaintained).toBe(false);
  });

  it("missing mission input → REJECTED", () => {
    const result = validateFocus({
      request: "Advance the Focus Validator work",
      mission: null,
      currentFocus,
    });
    expect(result.status).toBe("REJECTED");
    expect(result.missionRespected).toBe(false);
    expect(result.focusMaintained).toBe(false);
  });

  it("missing current focus input → REJECTED", () => {
    const result = validateFocus({
      request: "Advance Establish EXECUTIA Core AI",
      mission,
      currentFocus: null,
    });
    expect(result.status).toBe("REJECTED");
    expect(result.focusMaintained).toBe(false);
  });

  it("does not rewrite the user request", () => {
    const request = "  Advance Prove Focus Validator for Establish EXECUTIA Core AI  ";
    const result = validateFocus({ request, mission, currentFocus });
    expect(result).not.toHaveProperty("correctedRequest");
    expect(result.status).toBe("APPROVED");
  });
});

describe("Focus Validator pipeline stop (MVP 1.0)", () => {
  let goalId = "";
  let goalTitle = "Establish EXECUTIA Core AI";

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
        currentPhase: "Prove Focus Validator",
        milestones: {
          create: [
            {
              title: "Prove Focus Validator",
              acceptanceCriteria: "Focus Validator stops pipeline when not APPROVED",
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

  it("AI Executor is not called after NEEDS_CLARIFICATION", async () => {
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
        request: `What about ${goalTitle}?`,
        context: {},
      },
      provider,
    );

    expect(called).toBe(0);
    expect(result.executiaReport.preValidation).toBe("APPROVED");
    expect(result.executiaReport.executionStatus).toBe(
      "CLARIFICATION_REQUIRED",
    );
    expect(result.response).toContain("NEEDS_CLARIFICATION");
    expect(result.executiaReport.developmentCell.finding).toContain(
      "Focus Validator",
    );
  });

  it("AI Executor is not called after REJECTED", async () => {
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
        // Passes PRE (mentions mission) but Focus REJECTED (unrelated switch)
        request: `For ${goalTitle}, switch to an unrelated marketing campaign`,
        context: {},
      },
      provider,
    );

    expect(called).toBe(0);
    expect(result.executiaReport.preValidation).toBe("APPROVED");
    expect(result.executiaReport.executionStatus).toBe("BLOCKED");
    expect(result.response).toContain("REJECTED");
  });
});
