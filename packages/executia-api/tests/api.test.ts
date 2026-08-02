import { beforeAll, describe, expect, it } from "vitest";
import {
  ensureConstitutionLoaded,
  FakeAIProviderAdapter,
  prisma,
  type ProviderCallResult,
  type ProviderResponse,
} from "@executia/core-ai";
import { loadEnv } from "../src/env";
import { buildServer } from "../src/server";

const API_KEY = process.env.EXECUTIA_API_KEY ?? "test-executia-api-key";

const mission = "Live EXECUTIA OpenAI Integration";
const currentFocus = "Prove /execute through Core only";

const developmentCell = {
  mission,
  currentGoal: "Ship live /execute API",
  currentFocus,
  completedTasks: ["PRE Validation", "Focus Validator", "Development Cell"],
  remainingTasks: ["POST Validation", "Progress", "User Response"],
  lessonsLearned: ["Adapter is transport only"],
  openDecisions: ["Keep Core unchanged"],
  knownRisks: ["Direct OpenAI calls"],
  nextStep: "Run full HTTP pipeline",
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

function approvedAi(): ProviderResponse {
  return {
    response: `Completed ${currentFocus} for ${mission} with verified Core delivery.`,
    completed: ["POST Validation", "Progress", "User Response"],
    remaining: ["Controlled real OpenAI test"],
    nextPriorityAction: "Run controlled real OpenAI smoke test",
    milestoneEvidence: [],
    decisions: ["No direct OpenAI outside adapter"],
  };
}

function baseBody(overrides: Record<string, unknown> = {}) {
  return {
    mission,
    currentGoal: "Ship live /execute API",
    currentFocus,
    developmentCell,
    permissions: { aiExecutionAllowed: true },
    userRequest: `Advance ${currentFocus} for ${mission}`,
    ...overrides,
  };
}

describe("executia-api live /execute", () => {
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
  });

  it("1. GET /health succeeds without AI", async () => {
    let openaiCalls = 0;
    const provider = new FakeAIProviderAdapter(() => {
      openaiCalls += 1;
      return ok(approvedAi());
    });
    const env = loadEnv({
      ...process.env,
      EXECUTIA_API_KEY: API_KEY,
      DATABASE_URL: process.env.DATABASE_URL!,
      OPENAI_API_KEY: "unused-in-tests",
    });
    const app = await buildServer({ env, provider });
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      status: "ok",
      service: "executia-api",
      coreVersion: "1.0",
    });
    expect(openaiCalls).toBe(0);
    await app.close();
  });

  it("2. POST /execute without API key is rejected", async () => {
    const provider = new FakeAIProviderAdapter(() => ok(approvedAi()));
    const env = loadEnv({
      ...process.env,
      EXECUTIA_API_KEY: API_KEY,
      DATABASE_URL: process.env.DATABASE_URL!,
    });
    const app = await buildServer({ env, provider });
    const res = await app.inject({
      method: "POST",
      url: "/execute",
      payload: baseBody(),
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("3. Invalid request body is rejected", async () => {
    const provider = new FakeAIProviderAdapter(() => ok(approvedAi()));
    const env = loadEnv({
      ...process.env,
      EXECUTIA_API_KEY: API_KEY,
      DATABASE_URL: process.env.DATABASE_URL!,
    });
    const app = await buildServer({ env, provider });
    const res = await app.inject({
      method: "POST",
      url: "/execute",
      headers: { authorization: `Bearer ${API_KEY}` },
      payload: { mission: "only" },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("4+8+11+order. Full successful request through Core stages", async () => {
    const order: string[] = [];
    const provider = new FakeAIProviderAdapter(async () => {
      order.push("AI Executor");
      const latest = await prisma.executionRequest.findFirst({
        orderBy: { createdAt: "desc" },
        include: { preValidation: true, specification: true },
      });
      // When AI Executor runs: PRE done, Focus+Cell passed, status RUNNING
      expect(latest?.preValidation?.status).toBe("APPROVED");
      expect(latest?.specification).toBeTruthy();
      expect(latest?.status).toBe("RUNNING");
      order.push("OpenAI Provider");
      return ok(approvedAi());
    });

    const env = loadEnv({
      ...process.env,
      EXECUTIA_API_KEY: API_KEY,
      DATABASE_URL: process.env.DATABASE_URL!,
    });
    const app = await buildServer({ env, provider });
    const res = await app.inject({
      method: "POST",
      url: "/execute",
      headers: { authorization: `Bearer ${API_KEY}` },
      payload: baseBody(),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("APPROVED");
    expect(body.mission).toContain("Live EXECUTIA");
    expect(
      typeof body.completedPercent === "number" || body.completedPercent === null,
    ).toBe(true);
    expect(body.currentFocus.length).toBeGreaterThan(0);
    expect(body.nextStep.length).toBeGreaterThan(0);
    expect(body.response).toContain("MISSION");
    expect(body.response).toContain("STATUS BAR");
    expect(body.response).toContain("Completed %:");
    expect(body.response).toContain("Next Step:");
    expect(body.pipeline.preValidation).toMatch(/APPROVED|CORRECTED/);
    expect(body.pipeline.focusValidation).toBe("APPROVED");
    expect(body.pipeline.developmentCell).toBe("LOADED");
    expect(body.pipeline.aiExecutor).toBe("SUCCESS");
    expect(body.pipeline.postValidation).toBe("APPROVED");

    const execution = await prisma.executionRequest.findFirst({
      where: { id: body.executionId },
      include: {
        preValidation: true,
        aiExecutions: true,
        postValidations: true,
        verifiedResponse: true,
        stateUpdates: true,
      },
    });
    expect(execution).toBeTruthy();

    // Proven order: PRE → (Focus+Cell before AI) → AI → POST → Progress/Dev/User Response
    const preAt = execution!.preValidation!.createdAt.getTime();
    const aiAt = execution!.aiExecutions[0]!.createdAt.getTime();
    const postAt = execution!.postValidations[0]!.createdAt.getTime();
    const verifiedAt = execution!.verifiedResponse!.createdAt.getTime();
    expect(preAt).toBeLessThanOrEqual(aiAt);
    expect(aiAt).toBeLessThanOrEqual(postAt);
    expect(postAt).toBeLessThanOrEqual(verifiedAt);
    expect(execution!.stateUpdates.some((s) => s.approved)).toBe(true);
    expect(order).toEqual(["AI Executor", "OpenAI Provider"]);
    expect(body.response).toContain("Current Focus:");

    await app.close();
  });

  it("5. PRE blocked means OpenAI mock is never called", async () => {
    let openaiCalls = 0;
    const provider = new FakeAIProviderAdapter(() => {
      openaiCalls += 1;
      return ok(approvedAi());
    });
    const env = loadEnv({
      ...process.env,
      EXECUTIA_API_KEY: API_KEY,
      DATABASE_URL: process.env.DATABASE_URL!,
    });
    const app = await buildServer({ env, provider });
    const res = await app.inject({
      method: "POST",
      url: "/execute",
      headers: { authorization: `Bearer ${API_KEY}` },
      payload: baseBody({ userRequest: "tell me a joke" }),
    });
    expect(openaiCalls).toBe(0);
    expect([409, 422]).toContain(res.statusCode);
    expect(res.json().pipeline.preValidation).toBe("BLOCKED");
    expect(res.json().pipeline.aiExecutor).toBe("NOT_REACHED");
    await app.close();
  });

  it("6. Focus rejected means OpenAI mock is never called", async () => {
    let openaiCalls = 0;
    const provider = new FakeAIProviderAdapter(() => {
      openaiCalls += 1;
      return ok(approvedAi());
    });
    const env = loadEnv({
      ...process.env,
      EXECUTIA_API_KEY: API_KEY,
      DATABASE_URL: process.env.DATABASE_URL!,
    });
    const app = await buildServer({ env, provider });
    const res = await app.inject({
      method: "POST",
      url: "/execute",
      headers: { authorization: `Bearer ${API_KEY}` },
      payload: baseBody({
        userRequest: `For ${mission}, switch to an unrelated marketing campaign`,
      }),
    });
    expect(openaiCalls).toBe(0);
    expect(res.statusCode).toBe(422);
    expect(res.json().response).toContain("REJECTED");
    await app.close();
  });

  it("7. Development Cell blocked means OpenAI mock is never called", async () => {
    let openaiCalls = 0;
    const provider = new FakeAIProviderAdapter(() => {
      openaiCalls += 1;
      return ok(approvedAi());
    });
    const env = loadEnv({
      ...process.env,
      EXECUTIA_API_KEY: API_KEY,
      DATABASE_URL: process.env.DATABASE_URL!,
    });
    const app = await buildServer({ env, provider });
    const res = await app.inject({
      method: "POST",
      url: "/execute",
      headers: { authorization: `Bearer ${API_KEY}` },
      payload: baseBody({
        developmentCell: {
          ...developmentCell,
          nextStep: "   ",
        },
      }),
    });
    expect(openaiCalls).toBe(0);
    expect(res.statusCode).toBe(409);
    expect(res.json().response).toMatch(/Development Cell/i);
    await app.close();
  });

  it("9. OpenAI provider failure returns controlled provider failure", async () => {
    const provider = new FakeAIProviderAdapter(() => ({
      ok: false,
      provider: "fake",
      model: "fake-model",
      errorMessage: "simulated outage",
      latencyMs: 1,
      requestPayload: {},
    }));
    const env = loadEnv({
      ...process.env,
      EXECUTIA_API_KEY: API_KEY,
      DATABASE_URL: process.env.DATABASE_URL!,
    });
    const app = await buildServer({ env, provider });
    const res = await app.inject({
      method: "POST",
      url: "/execute",
      headers: { authorization: `Bearer ${API_KEY}` },
      payload: baseBody(),
    });
    expect(res.statusCode).toBe(502);
    expect(res.json().status).toBe("PROVIDER_FAILED");
    expect(res.json().response).not.toContain("STATUS BAR");
    await app.close();
  });

  it("10. POST rejected does not return a user response", async () => {
    const provider = new FakeAIProviderAdapter(() =>
      ok({
        response: "Totally unrelated fluff with no mission respect.",
        completed: [],
        remaining: [],
        nextPriorityAction: "n/a",
        milestoneEvidence: [],
        decisions: [],
      }),
    );
    const env = loadEnv({
      ...process.env,
      EXECUTIA_API_KEY: API_KEY,
      DATABASE_URL: process.env.DATABASE_URL!,
    });
    const app = await buildServer({ env, provider });
    const res = await app.inject({
      method: "POST",
      url: "/execute",
      headers: { authorization: `Bearer ${API_KEY}` },
      payload: baseBody(),
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().response).toContain("REJECTED");
    expect(res.json().response).not.toContain("STATUS BAR");
    expect(res.json().pipeline.postValidation).toBe("BLOCKED");
    await app.close();
  });
});
