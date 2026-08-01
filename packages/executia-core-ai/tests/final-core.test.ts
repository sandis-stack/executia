import { beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { executeCoreRequest } from "@/core/run-core-execution";
import { runPostValidation } from "@/core/engines/post-validation-engine";
import { calculateExecutionProgress } from "@/core/engines/progress-engine";
import {
  applyDevelopmentUpdate,
  type DevelopmentCellContext,
} from "@/core/engines/development-cell";
import { buildUserResponse } from "@/core/report/report-builder";
import { ensureConstitutionLoaded } from "@/core/constitution/load";
import {
  FakeAIProviderAdapter,
  type ProviderCallResult,
} from "@/core/providers/ai-provider-adapter";
import type { ProviderResponse } from "@/domain/schemas";

const prisma = new PrismaClient();

const cell: DevelopmentCellContext = {
  mission: "Establish EXECUTIA Core AI",
  currentGoal: "Complete MVP Core",
  currentFocus: "Prove Final Core Pipeline",
  completedTasks: ["PRE Validation", "Focus Validator"],
  remainingTasks: ["POST Validation", "User Response"],
  lessonsLearned: ["Fail closed"],
  openDecisions: ["Keep pipeline order"],
  knownRisks: ["POST rejection"],
  nextStep: "Run full pipeline",
};

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

function approvedAi(goalTitle: string): ProviderResponse {
  return {
    response: `Completed Prove Final Core Pipeline work for ${goalTitle} with verified output.`,
    completed: ["POST Validation", "User Response"],
    remaining: ["Ship MVP"],
    nextPriorityAction: "Ship EXECUTIA Core MVP 1.0",
    milestoneEvidence: [],
    decisions: ["Preserve pipeline order"],
  };
}

describe("Final Core units (MVP 1.0)", () => {
  it("POST rejected when mission not respected", () => {
    const result = runPostValidation({
      aiResponse: "Unrelated fluff",
      parsed: {
        response: "Unrelated fluff",
        completed: ["x"],
        remaining: ["y"],
        nextPriorityAction: "z",
        milestoneEvidence: [],
        decisions: [],
      },
      mission: { title: "Establish EXECUTIA Core AI" },
      currentFocus: { label: "Prove Final Core Pipeline" },
      developmentCell: cell,
    });
    expect(result.status).toBe("REJECTED");
  });

  it("Progress calculated correctly", () => {
    const progress = calculateExecutionProgress({
      developmentCell: cell,
      completedFromAi: ["POST Validation"],
      remainingFromAi: ["Ship MVP"],
      currentFocus: cell.currentFocus,
      nextStep: "Ship MVP",
    });
    expect(progress.completedPercent + progress.remainingPercent).toBe(100);
    expect(progress.currentFocus).toBe(cell.currentFocus);
    expect(progress.nextStep).toBe("Ship MVP");
  });

  it("Development update merges without inventing", () => {
    const updated = applyDevelopmentUpdate({
      developmentCell: cell,
      completedTasks: ["POST Validation"],
      remainingTasks: ["Ship MVP"],
      lessonsLearned: [],
      nextStep: "Ship MVP",
    });
    expect(updated.completedTasks).toContain("POST Validation");
    expect(updated.lessonsLearned).toEqual(cell.lessonsLearned);
    expect(updated.nextStep).toBe("Ship MVP");
    expect(updated.mission).toBe(cell.mission);
  });

  it("User Response formatting only", () => {
    const text = buildUserResponse({
      mission: cell.mission,
      status: "APPROVED",
      progress: {
        completedPercent: 50,
        remainingPercent: 50,
        currentFocus: cell.currentFocus,
        nextStep: "Ship MVP",
      },
      aiResponse: "Body",
    });
    expect(text).toContain("MISSION");
    expect(text).toContain("STATUS BAR");
    expect(text).toContain("Completed %: 50");
    expect(text).toContain("Remaining %: 50");
    expect(text).toContain("Current Focus:");
    expect(text).toContain("Next Step:");
    expect(text).toContain("Body");
  });
});

describe("Final Core pipeline integration (MVP 1.0)", () => {
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
        currentPhase: "Prove Final Core Pipeline",
        milestones: {
          create: [
            {
              title: "Prove Final Core Pipeline",
              acceptanceCriteria: "Full pipeline delivers User Response",
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

  it("complete successful execution", async () => {
    const provider = new FakeAIProviderAdapter(() =>
      ok(approvedAi(goalTitle)),
    );
    const result = await executeCoreRequest(
      {
        goalId,
        request: `Advance Prove Final Core Pipeline for ${goalTitle}`,
        context: { developmentCell: cell },
      },
      provider,
    );
    expect(result.executiaReport.executionStatus).toBe("APPROVED");
    expect(result.executiaReport.postValidation).toBe("APPROVED");
    expect(result.response).toContain("MISSION");
    expect(result.response).toContain("STATUS BAR");
    expect(result.response).toContain("Completed %:");
    expect(result.deliveredBy).toBe("ResponseGate");
  });

  it("POST rejected stops without User Response header", async () => {
    let progressTouched = false;
    const provider = new FakeAIProviderAdapter(() =>
      ok({
        response: "Totally unrelated fluff.",
        completed: [],
        remaining: [],
        nextPriorityAction: "",
        milestoneEvidence: [],
        decisions: [],
      }),
    );
    const beforeStates = await prisma.executionState.count({
      where: { goalId, approved: true },
    });
    const result = await executeCoreRequest(
      {
        goalId,
        request: `Advance Prove Final Core Pipeline for ${goalTitle}`,
        context: { developmentCell: cell },
      },
      provider,
    );
    expect(result.executiaReport.executionStatus).toBe("BLOCKED");
    expect(result.response).toContain("REJECTED");
    expect(result.response).not.toContain("STATUS BAR");
    const afterStates = await prisma.executionState.count({
      where: { goalId, approved: true },
    });
    expect(afterStates).toBe(beforeStates);
    void progressTouched;
  });

  it("Development updated only after POST APPROVED", async () => {
    const before = await prisma.executionState.count({
      where: { goalId, approved: true },
    });
    const provider = new FakeAIProviderAdapter(() =>
      ok(approvedAi(goalTitle)),
    );
    const result = await executeCoreRequest(
      {
        goalId,
        request: `Advance Prove Final Core Pipeline for ${goalTitle}`,
        context: { developmentCell: cell },
      },
      provider,
    );
    expect(result.executiaReport.executionStatus).toBe("APPROVED");
    const after = await prisma.executionState.count({
      where: { goalId, approved: true },
    });
    expect(after).toBeGreaterThan(before);
    expect(result.executiaReport.completed.length).toBeGreaterThan(0);
  });

  it("User Response generated only after POST APPROVED", async () => {
    const provider = new FakeAIProviderAdapter(() =>
      ok(approvedAi(goalTitle)),
    );
    const result = await executeCoreRequest(
      {
        goalId,
        request: `Advance Prove Final Core Pipeline for ${goalTitle}`,
        context: { developmentCell: cell },
      },
      provider,
    );
    expect(result.response.startsWith("MISSION")).toBe(true);
    expect(result.response).toContain("Next Step:");
  });

  it("AI failure", async () => {
    const provider = new FakeAIProviderAdapter(() => ({
      ok: false,
      provider: "fake",
      model: "fake-model",
      errorMessage: "outage",
      latencyMs: 1,
      requestPayload: {},
    }));
    const result = await executeCoreRequest(
      {
        goalId,
        request: `Advance Prove Final Core Pipeline for ${goalTitle}`,
        context: { developmentCell: cell },
      },
      provider,
    );
    expect(result.executiaReport.executionStatus).toBe("PROVIDER_FAILED");
    expect(result.response).not.toContain("STATUS BAR");
  });

  it("PRE failure", async () => {
    let called = 0;
    const provider = new FakeAIProviderAdapter(() => {
      called += 1;
      return ok(approvedAi(goalTitle));
    });
    const result = await executeCoreRequest(
      { goalId, request: "tell me a joke", context: { developmentCell: cell } },
      provider,
    );
    expect(called).toBe(0);
    expect(result.executiaReport.preValidation).toBe("BLOCKED");
  });

  it("Focus failure", async () => {
    let called = 0;
    const provider = new FakeAIProviderAdapter(() => {
      called += 1;
      return ok(approvedAi(goalTitle));
    });
    const result = await executeCoreRequest(
      {
        goalId,
        request: `For ${goalTitle}, switch to an unrelated marketing campaign`,
        context: { developmentCell: cell },
      },
      provider,
    );
    expect(called).toBe(0);
    expect(result.response).toContain("REJECTED");
  });

  it("Development Cell BLOCKED", async () => {
    let called = 0;
    const provider = new FakeAIProviderAdapter(() => {
      called += 1;
      return ok(approvedAi(goalTitle));
    });
    const result = await executeCoreRequest(
      {
        goalId,
        request: `Advance Prove Final Core Pipeline for ${goalTitle}`,
        context: {},
      },
      provider,
    );
    expect(called).toBe(0);
    expect(result.response).toContain("Development Cell");
  });

  it("Full pipeline execution", async () => {
    const provider = new FakeAIProviderAdapter(() =>
      ok(approvedAi(goalTitle)),
    );
    const result = await executeCoreRequest(
      {
        goalId,
        request: `Advance Prove Final Core Pipeline for ${goalTitle}`,
        context: { developmentCell: cell },
      },
      provider,
    );
    expect(result.executiaReport.preValidation).toMatch(/APPROVED|CORRECTED/);
    expect(result.executiaReport.postValidation).toBe("APPROVED");
    expect(result.response).toContain("MISSION");
    expect(result.response).toContain("Completed %:");
    expect(result.response).toContain("Remaining %:");
    expect(result.response).toContain("Current Focus:");
    expect(result.response).toContain("Next Step:");
    expect(result.deliveredBy).toBe("ResponseGate");
  });
});
