import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ExecutionSpec } from "@executia/core-ai";
import {
  buildOpenAIInstructions,
  extractResponsesOutputText,
  OpenAIResponsesProvider,
} from "../src/providers/openai-provider";

function walk(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, files);
    else if (p.endsWith(".ts")) files.push(p);
  }
  return files;
}

describe("architecture — OpenAI only via adapter", () => {
  it("12. No direct OpenAI call exists outside the provider adapter", () => {
    const root = join(process.cwd(), "src");
    const files = walk(root).filter(
      (f) => !f.endsWith("providers/openai-provider.ts"),
    );
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      if (
        text.includes("api.openai.com") ||
        text.includes("/v1/responses") ||
        text.includes("/chat/completions")
      ) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("OpenAI adapter calls Responses API and returns transport result only", async () => {
    const originalFetch = globalThis.fetch;
    let calledUrl = "";
    globalThis.fetch = async (input, init) => {
      calledUrl = String(input);
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(body.instructions).toContain("Do not invent completed work");
      expect(body.instructions).toContain(
        "Do not calculate official EXECUTIA progress",
      );
      expect(body.instructions).toContain("nextPriorityAction");
      expect(body.input).toMatch(/non-empty/i);
      expect(body.input).toMatch(/\bjson\b/i);
      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            response: "raw adapter output",
            completed: ["a"],
            remaining: ["b"],
            nextPriorityAction: "c",
            milestoneEvidence: [],
            decisions: [],
          }),
        }),
        { status: 200 },
      );
    };

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

    try {
      const adapter = new OpenAIResponsesProvider({
        apiKey: "test-key",
        model: "gpt-4o-mini",
      });
      const result = await adapter.execute(spec);
      expect(calledUrl).toBe("https://api.openai.com/v1/responses");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.parsed.response).toBe("raw adapter output");
        expect(result.provider).toBe("openai-responses");
      }
      expect(buildOpenAIInstructions(spec)).toContain("EXECUTIA Core");
      expect(
        extractResponsesOutputText(JSON.stringify({ output_text: "hello" })),
      ).toBe("hello");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
