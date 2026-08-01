import { beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { executeCoreRequest } from "@/core/run-core-execution";
import { deliverThroughResponseGate, RESPONSE_GATE_MARKER } from "@/core/gate/response-gate";
import { calculateProgress } from "@/core/engines/progress-engine";
import { classifyGoalAlignment } from "@/core/engines/focus-engine";
import { ensureConstitutionLoaded } from "@/core/constitution/load";
import { CONSTITUTION_VERSION } from "@/core/constitution/laws";
import { assertConstitutionImmutable } from "@/core/engines/law-engine";
import { buildExecutiaReport } from "@/core/report/report-builder";
import {
  FakeAIProviderAdapter,
  type ProviderCallResult,
} from "@/core/providers/ai-provider-adapter";
import type { ProviderResponse } from "@/domain/schemas";
import { loadExecutionMemory } from "@/core/memory/execution-memory";


const prisma = new PrismaClient();

/** Complete Development Cell required after Focus APPROVED (Task 3). */
function withCell(extra: Record<string, unknown> = {}) {
  return {
    developmentCell: {
      mission: "Establish EXECUTIA Core AI",
      currentGoal: "Prove Core AI vertical",
      currentFocus: "Prove ResponseGate",
      completedTasks: ["Constitution loaded"],
      remainingTasks: ["Acceptance suite"],
      lessonsLearned: ["Fail closed before delivery"],
      openDecisions: ["Keep ResponseGate exclusive"],
      knownRisks: ["Missing cell blocks AI"],
      nextStep: "Continue validated execution",
    },
    ...extra,
  };
}


async function seedGoal(opts?: { withMilestones?: boolean }) {
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

  const withMilestones = opts?.withMilestones !== false;

  return prisma.primaryGoal.create({
    data: {
      title: "Establish EXECUTIA Core AI",
      description:
        "Ship a constitution-governed AI execution layer with ResponseGate.",
      currentPhase: "Prove vertical",
      milestones: withMilestones
        ? {
            create: [
              {
                title: "Load constitution",
                acceptanceCriteria: "Active locked ConstitutionVersion exists",
                weight: 1,
                orderIndex: 0,
                status: "COMPLETED",
                evidence: "ensureConstitutionLoaded",
                completedAt: new Date(),
              },
              {
                title: "Prove ResponseGate",
                acceptanceCriteria: "Only ResponseGate delivers verified responses",
                weight: 2,
                orderIndex: 1,
                status: "IN_PROGRESS",
              },
              {
                title: "Acceptance suite green",
                acceptanceCriteria: "All Core AI acceptance tests pass",
                weight: 1,
                orderIndex: 2,
                status: "PENDING",
              },
            ],
          }
        : undefined,
    },
    include: { milestones: true },
  });
}

function ok(
  parsed: ProviderResponse,
  extras?: Partial<Extract<ProviderCallResult, { ok: true }>>,
): ProviderCallResult {
  return {
    ok: true,
    provider: "fake",
    model: "fake-model",
    rawText: JSON.stringify(parsed),
    parsed,
    latencyMs: 1,
    requestPayload: { fake: true },
    ...extras,
  };
}

describe("EXECUTIA Core AI acceptance", () => {
  let goalId = "";
  let goalTitle = "Establish EXECUTIA Core AI";

  beforeAll(async () => {
    const goal = await seedGoal();
    goalId = goal.id;
    goalTitle = goal.title;
  });

  it("AI execution cannot occur without the EXECUTIA Constitution", async () => {
    let called = 0;
    const provider = new FakeAIProviderAdapter(() => {
      called += 1;
      return ok({
        response: "nope",
        completed: [],
        remaining: [],
        nextPriorityAction: "x",
        milestoneEvidence: [],
        decisions: [],
      });
    });

    await expect(
      executeCoreRequest(
        { goalId, request: `Advance ${goalTitle}`, context: withCell() },
        provider,
        { skipConstitutionLoad: true },
      ),
    ).rejects.toThrow(/Constitution/);
    expect(called).toBe(0);
  });

  it("missing primary goal blocks execution", async () => {
    let called = 0;
    const provider = new FakeAIProviderAdapter(() => {
      called += 1;
      return ok({
        response: "nope",
        completed: [],
        remaining: [],
        nextPriorityAction: "x",
        milestoneEvidence: [],
        decisions: [],
      });
    });

    await expect(
      executeCoreRequest(
        {
          goalId: "missing-goal-id",
          request: "Do something useful",
          context: withCell(),
        },
        provider,
      ),
    ).rejects.toThrow(/Primary goal missing/);
    expect(called).toBe(0);
  });

  it("goal alignment is determined for every request", () => {
    const alignment = classifyGoalAlignment(
      `Help prove ResponseGate for ${goalTitle}`,
      {
        id: goalId,
        title: goalTitle,
        description: "Ship core",
        status: "ACTIVE",
        currentPhase: "Prove",
        createdAt: new Date(),
        updatedAt: new Date(),
        milestones: [],
      },
    );
    expect([
      "DIRECTLY_ALIGNED",
      "SUPPORTING",
      "NEUTRAL",
      "CONFLICTING",
    ]).toContain(alignment);
  });

  it("raw provider output can never reach the user", async () => {
    const rawEnvelope =
      '{"choices":[{"message":{"content":"RAW_LEAK"}}],"usage":{}}';
    const provider = new FakeAIProviderAdapter(() =>
      ok(
        {
          response: `Verified work on ${goalTitle} without leaking envelopes.`,
          completed: ["Validated gate"],
          remaining: ["Finish suite"],
          nextPriorityAction: "Run remaining Core AI tests.",
          milestoneEvidence: [],
          decisions: ["Keep raw internal"],
        },
        { rawText: rawEnvelope },
      ),
    );

    const result = await executeCoreRequest(
      {
        goalId,
        request: `Advance Prove ResponseGate for ${goalTitle}`,
        context: withCell(),
      },
      provider,
    );

    expect(result.response).not.toContain("RAW_LEAK");
    expect(result.response).not.toContain('"choices"');
    expect(result.deliveredBy).toBe(RESPONSE_GATE_MARKER);
  });

  it("failed pre-validation blocks the provider call", async () => {
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
      { goalId, request: "tell me a joke", context: withCell() },
      provider,
    );

    expect(called).toBe(0);
    expect(result.executiaReport.preValidation).toBe("BLOCKED");
    expect(result.executiaReport.executionStatus).toBe("BLOCKED");
    expect(result.deliveredBy).toBe("ResponseGate");
  });

  it("failed post-validation blocks delivery", async () => {
    const provider = new FakeAIProviderAdapter(() =>
      ok({
        response: "Unrelated fluff with no goal.",
        completed: [],
        remaining: [],
        nextPriorityAction: "",
        milestoneEvidence: [],
        decisions: [],
      }),
    );

    const result = await executeCoreRequest(
      {
        goalId,
        request: `Work on Prove ResponseGate for ${goalTitle}`,
        context: withCell(),
      },
      provider,
    );

    expect(result.executiaReport.executionStatus).toBe("BLOCKED");
    expect(result.executiaReport.postValidation).toBe("BLOCKED");
    expect(result.deliveredBy).toBe("ResponseGate");
  });

  it("missing EXECUTIA report blocks delivery", () => {
    expect(() =>
      deliverThroughResponseGate({
        response: "hi",
        report: {
          primaryGoal: "",
          currentTask: "",
          goalAlignment: "DIRECTLY_ALIGNED",
          executionStatus: "APPROVED",
          overallProgressPercent: 0,
          taskProgressPercent: 0,
          progressStatus: "MEASURABLE",
          completed: [],
          remaining: [],
          preValidation: "APPROVED",
          postValidation: "APPROVED",
          nextPriorityAction: "x",
          developmentCell: { finding: "", proposal: null, status: "NO_CHANGE" },
        },
        executionId: "x",
        ledgerOk: true,
        blockedDelivery: false,
      }),
    ).toThrow(/ResponseGate/);
  });

  it("missing next priority action blocks delivery", () => {
    expect(() =>
      deliverThroughResponseGate({
        response: "ok",
        report: buildExecutiaReport({
          primaryGoal: goalTitle,
          currentTask: "task",
          goalAlignment: "DIRECTLY_ALIGNED",
          executionStatus: "APPROVED",
          overallProgressPercent: 0,
          taskProgressPercent: 0,
          progressStatus: "MEASURABLE",
          completed: ["a"],
          remaining: ["b"],
          preValidation: "APPROVED",
          postValidation: "APPROVED",
          nextPriorityAction: "   ",
          developmentCell: {
            finding: "ok",
            proposal: null,
            status: "NO_CHANGE",
          },
        }),
        executionId: "x",
        ledgerOk: true,
      }),
    ).toThrow();
  });

  it("progress cannot be invented and empty milestones are NOT_MEASURABLE", async () => {
    const empty = await seedGoal({ withMilestones: false });
    try {
      const progress = calculateProgress([]);
      expect(progress.progressStatus).toBe("NOT_MEASURABLE");
      expect(progress.overallProgressPercent).toBeNull();

      const provider = new FakeAIProviderAdapter(() =>
        ok({
          response: `Continuing ${empty.title} without inventing progress.`,
          completed: ["Reviewed measurability"],
          remaining: ["Add weighted milestones"],
          nextPriorityAction: "Define milestones with weights and evidence.",
          milestoneEvidence: [],
          decisions: ["Do not invent percent"],
        }),
      );

      const result = await executeCoreRequest(
        {
          goalId: empty.id,
          request: `Advance work on ${empty.title} regarding progress protocol`,
          context: withCell(),
        },
        provider,
      );

      expect(result.executiaReport.progressStatus).toBe("NOT_MEASURABLE");
      expect(result.executiaReport.overallProgressPercent).toBeNull();
      expect(result.response).toContain("Completed %:");
    } finally {
      const restored = await seedGoal();
      goalId = restored.id;
      goalTitle = restored.title;
    }
  });

  it("memory is loaded before execution and updated only after approved execution", async () => {
    const beforeStates = await prisma.executionState.count({
      where: { goalId, approved: true },
    });

    let called = 0;
    const blockProvider = new FakeAIProviderAdapter(() => {
      called += 1;
      return ok({
        response: "bad",
        completed: [],
        remaining: [],
        nextPriorityAction: "",
        milestoneEvidence: [],
        decisions: [],
      });
    });

    await executeCoreRequest(
      {
        goalId,
        request: `Touch Prove ResponseGate for ${goalTitle}`,
        context: withCell(),
      },
      blockProvider,
    );
    expect(called).toBeGreaterThan(0);

    const midStates = await prisma.executionState.count({
      where: { goalId, approved: true },
    });
    expect(midStates).toBe(beforeStates);

    const mem = await loadExecutionMemory(goalId);
    expect(mem.loaded).toBe(true);

    const okProvider = new FakeAIProviderAdapter(() =>
      ok({
        response: `Approved Prove ResponseGate continuity step for ${goalTitle}.`,
        completed: ["Memory write after approval"],
        remaining: ["Acceptance suite green"],
        nextPriorityAction: "Continue from this approved state.",
        milestoneEvidence: [],
        decisions: ["Update memory after approval only"],
      }),
    );

    const approved = await executeCoreRequest(
      {
        goalId,
        request: `Approve a step for ${goalTitle} Prove ResponseGate`,
        context: withCell(),
      },
      okProvider,
    );

    expect(["APPROVED", "APPROVED_WITH_WARNINGS"]).toContain(
      approved.executiaReport.executionStatus,
    );
    const afterStates = await prisma.executionState.count({
      where: { goalId, approved: true },
    });
    expect(afterStates).toBe(beforeStates + 1);
  });

  it("Development Cell proposals cannot automatically change Core laws", async () => {
    const before = await prisma.constitutionVersion.findUniqueOrThrow({
      where: { version: CONSTITUTION_VERSION },
    });

    const provider = new FakeAIProviderAdapter(() =>
      ok({
        response: `Cell check Prove ResponseGate for ${goalTitle}.`,
        completed: ["Ran cell"],
        remaining: ["Keep laws locked"],
        nextPriorityAction: "Leave Constitution locked.",
        milestoneEvidence: [],
        decisions: [],
      }),
    );

    await executeCoreRequest(
      {
        goalId,
        request: `Run Development Cell assessment for ${goalTitle}`,
        context: withCell(),
      },
      provider,
    );

    const after = await prisma.constitutionVersion.findUniqueOrThrow({
      where: { version: CONSTITUTION_VERSION },
    });
    expect(after.locked).toBe(true);
    expect(JSON.stringify(after.lawsJson)).toBe(JSON.stringify(before.lawsJson));
    expect(assertConstitutionImmutable(true, true, false).ok).toBe(true);

    const applied = await prisma.developmentProposal.count({
      where: { applied: true },
    });
    expect(applied).toBe(0);
  });

  it("every response continues from the last approved execution state", async () => {
    const mem = await loadExecutionMemory(goalId);
    expect(mem.priorState).not.toBeNull();

    const provider = new FakeAIProviderAdapter((spec) => {
      expect(spec.priorState).not.toBeNull();
      return ok({
        response: `Continued Prove ResponseGate for ${goalTitle} from prior approved state.`,
        completed: ["Loaded prior state"],
        remaining: ["Acceptance suite green"],
        nextPriorityAction: "Keep continuity.",
        milestoneEvidence: [],
        decisions: ["Honor CONTINUITY LAW"],
      });
    });

    const result = await executeCoreRequest(
      {
        goalId,
        request: `Continue Establish EXECUTIA Core AI from prior state`,
        context: withCell(),
      },
      provider,
    );

    expect(result.executiaReport.currentTask.toLowerCase()).toContain(
      "continuing",
    );
    expect(result.deliveredBy).toBe("ResponseGate");
  });

  it("only ResponseGate can deliver a user-facing response", async () => {
    const provider = new FakeAIProviderAdapter(() =>
      ok({
        response: `Gate exclusivity proof Prove ResponseGate for ${goalTitle}.`,
        completed: ["Delivered via gate"],
        remaining: ["Done"],
        nextPriorityAction: "Ship Core AI.",
        milestoneEvidence: [],
        decisions: [],
      }),
    );

    const result = await executeCoreRequest(
      {
        goalId,
        request: `Prove only ResponseGate delivers for ${goalTitle}`,
        context: withCell(),
      },
      provider,
    );

    expect(result.deliveredBy).toBe("ResponseGate");
    expect(result.executiaReport.primaryGoal).toBe(goalTitle);
    expect(result.executiaReport.nextPriorityAction.length).toBeGreaterThan(0);
    expect(result.executiaReport.developmentCell.finding.length).toBeGreaterThan(
      0,
    );
  });

  it("full vertical: goal → memory → classify → pre → AI → post → memory → cell → report → gate", async () => {
    const goal = await seedGoal();
    const provider = new FakeAIProviderAdapter(() =>
      ok({
        response: `Verified Prove ResponseGate result for ${goal.title}.`,
        completed: ["Applied verification"],
        remaining: ["Acceptance suite green"],
        nextPriorityAction: "Mark Prove ResponseGate complete with evidence.",
        milestoneEvidence: [
          {
            milestoneTitle: "Prove ResponseGate",
            evidence: "Acceptance vertical passed via ResponseGate.",
            markComplete: true,
          },
        ],
        decisions: ["Pipeline complete"],
      }),
    );

    const result = await executeCoreRequest(
      {
        goalId: goal.id,
        request: `Complete Prove ResponseGate for ${goal.title}`,
        context: withCell(),
      },
      provider,
    );

    expect(["APPROVED", "APPROVED_WITH_WARNINGS"]).toContain(
      result.executiaReport.executionStatus,
    );
    expect(result.response).toContain("MISSION");
    expect(result.executiaReport.goalAlignment).toBeTruthy();
    expect(result.executiaReport.preValidation).toMatch(/APPROVED|CORRECTED/);
    expect(result.executiaReport.postValidation).toMatch(/APPROVED/);
    expect(result.executiaReport.developmentCell).toBeTruthy();
    expect(result.deliveredBy).toBe("ResponseGate");

    const ledger = await prisma.executionRequest.findUnique({
      where: { id: result.executionId },
      include: {
        preValidation: true,
        aiExecutions: true,
        postValidations: true,
        verifiedResponse: true,
      },
    });
    expect(ledger?.preValidation).toBeTruthy();
    expect(ledger?.aiExecutions.length).toBeGreaterThan(0);
    expect(ledger?.postValidations.length).toBeGreaterThan(0);
    expect(ledger?.verifiedResponse).toBeTruthy();
  });
});
