import { describe, expect, it } from "vitest";
import { ProviderResponseSchema } from "@executia/core-ai";
import type { ExecutionSpec } from "@executia/core-ai";
import {
  buildOpenAIInstructions,
  buildOpenAIUserInput,
  OpenAIResponsesProvider,
  PROVIDER_OUTPUT_CONTRACT,
} from "../src/providers/openai-provider";

const spec: ExecutionSpec = {
  constitutionVersion: "1.0",
  laws: [],
  goalTitle: "Mission",
  goalDescription: "Desc",
  currentTask: "Focus",
  goalAlignment: "DIRECTLY_ALIGNED",
  priorState: null,
  milestones: [],
  constraints: [],
  pendingTasks: [],
  userRequest: "Advance Focus for Mission",
  context: {
    developmentCell: {
      mission: "Mission",
      currentGoal: "Goal",
      currentFocus: "Focus",
      completedTasks: [],
      remainingTasks: ["x"],
      lessonsLearned: [],
      openDecisions: [],
      knownRisks: [],
      nextStep: "y",
    },
  },
  outputContract: "ProviderResponseSchema",
};

describe("OpenAI provider JSON output contract", () => {
  it("prompt explicitly requires every string field to be non-empty", () => {
    const instructions = buildOpenAIInstructions(spec);
    const input = buildOpenAIUserInput(spec);
    for (const text of [instructions, input, PROVIDER_OUTPUT_CONTRACT]) {
      expect(text).toMatch(/non-empty/i);
      expect(text).toContain("nextPriorityAction");
      expect(text).toContain("response");
      expect(text).toMatch(/one JSON object only/i);
      expect(text).toMatch(/Do not use null, empty string/i);
    }
  });

  it("non-empty nextPriorityAction is accepted", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            response: "Verified explanation of EXECUTIA Core.",
            completed: ["POST Validation"],
            remaining: ["Review result"],
            nextPriorityAction: "Review approved live execution evidence",
            milestoneEvidence: [],
            decisions: [],
          }),
        }),
        { status: 200 },
      );

    try {
      const adapter = new OpenAIResponsesProvider({ apiKey: "test-key" });
      const result = await adapter.execute(spec);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.parsed.nextPriorityAction.length).toBeGreaterThan(0);
        expect(() =>
          ProviderResponseSchema.parse(result.parsed),
        ).not.toThrow();
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("empty nextPriorityAction is rejected", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            response: "Some response text",
            completed: [],
            remaining: [],
            nextPriorityAction: "",
            milestoneEvidence: [],
            decisions: [],
          }),
        }),
        { status: 200 },
      );

    try {
      const adapter = new OpenAIResponsesProvider({ apiKey: "test-key" });
      const result = await adapter.execute(spec);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errorMessage).toMatch(/nextPriorityAction|Too small/i);
      }
      expect(() =>
        ProviderResponseSchema.parse({
          response: "Some response text",
          completed: [],
          remaining: [],
          nextPriorityAction: "",
          milestoneEvidence: [],
          decisions: [],
        }),
      ).toThrow();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
