import { describe, expect, it } from "vitest";
import { resolveEnforcedMissionTitle } from "../src/services/goal";
import { buildCoreBoundRequest } from "../src/services/execute-service";
import type { ExecuteRequest } from "../src/services/schemas";

describe("resolveEnforcedMissionTitle", () => {
  it("uses EXECUTIA Core as enforceable title for long product mission statements", () => {
    expect(
      resolveEnforcedMissionTitle(
        "Prove that a real OpenAI response can execute only through EXECUTIA Core.",
      ),
    ).toBe("EXECUTIA Core");
  });

  it("keeps short missions unchanged", () => {
    expect(resolveEnforcedMissionTitle("EXECUTIA Core")).toBe("EXECUTIA Core");
    expect(resolveEnforcedMissionTitle("Ship MVP")).toBe("Ship MVP");
  });
});

const base: ExecuteRequest = {
  mission:
    "Prove that a real OpenAI response can execute only through EXECUTIA Core.",
  currentGoal: "Complete the first controlled real provider execution.",
  currentFocus: "Return one concise verified explanation of EXECUTIA Core.",
  developmentCell: {
    mission:
      "Prove that a real OpenAI response can execute only through EXECUTIA Core.",
    currentGoal: "Complete the first controlled real provider execution.",
    currentFocus: "Return one concise verified explanation of EXECUTIA Core.",
    completedTasks: [],
    remainingTasks: [],
    lessonsLearned: [],
    openDecisions: [],
    knownRisks: [],
    nextStep: "Run one real OpenAI request through POST /execute",
  },
  permissions: { aiExecutionAllowed: true },
  userRequest:
    "Explain EXECUTIA Core in no more than three sentences, focusing only on how it validates AI execution before and after the model response.",
};

describe("buildCoreBoundRequest — mission reference for POST Validation", () => {
  it("requires the enforceable mission title Core POST substring-checks", () => {
    const request = buildCoreBoundRequest(base);
    expect(request).toContain(base.userRequest);
    expect(request).toContain("EXECUTIA Core");
    expect(request).toMatch(/include this exact phrase verbatim/i);
  });
});
