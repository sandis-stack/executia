/**
 * EXECUTIA Core MVP 1.0 — Focus Validator
 *
 * Independent of PRE Validation. Does not rewrite requests,
 * update Development Cell, calculate progress, or call the AI Executor.
 */

import type { GoalAlignment } from "@/domain/schemas";
import type { GoalWithMilestones } from "@/core/memory/goal-memory";

export type FocusValidationStatus =
  | "APPROVED"
  | "NEEDS_CLARIFICATION"
  | "REJECTED";

export type FocusValidationInput = {
  request: string;
  mission: { id: string; title: string; description?: string } | null;
  currentFocus: { label: string } | null;
};

export type FocusValidationResult = {
  status: FocusValidationStatus;
  reason: string;
  missionRespected: boolean;
  focusMaintained: boolean;
};

const REJECT_MARKERS = [
  "ignore the goal",
  "abandon the goal",
  "forget the primary goal",
  "do the opposite",
  "unrelated hobby only",
  "tell me a joke",
  "write me a poem about cats",
  "switch to an unrelated",
  "change the mission",
];

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2),
  );
}

function overlap(a: string, b: string): number {
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.size === 0 || B.size === 0) return 0;
  let hits = 0;
  for (const t of A) if (B.has(t)) hits += 1;
  return hits / A.size;
}

/**
 * Determine whether the request helps achieve the active Mission and Current Focus.
 */
export function validateFocus(
  input: FocusValidationInput,
): FocusValidationResult {
  if (!input.mission || !input.mission.id.trim() || !input.mission.title.trim()) {
    return {
      status: "REJECTED",
      reason: "Active Mission is missing.",
      missionRespected: false,
      focusMaintained: false,
    };
  }

  if (!input.currentFocus || !input.currentFocus.label.trim()) {
    return {
      status: "REJECTED",
      reason: "Current Focus is missing.",
      missionRespected: false,
      focusMaintained: false,
    };
  }

  const request = input.request.trim();
  if (!request) {
    return {
      status: "NEEDS_CLARIFICATION",
      reason: "Request is empty or missing necessary information.",
      missionRespected: true,
      focusMaintained: false,
    };
  }

  const lower = request.toLowerCase();
  for (const marker of REJECT_MARKERS) {
    if (lower.includes(marker)) {
      return {
        status: "REJECTED",
        reason:
          "Request does not support the active Mission or moves away from Current Focus.",
        missionRespected: false,
        focusMaintained: false,
      };
    }
  }

  const missionBlob = `${input.mission.title} ${input.mission.description ?? ""}`;
  const focusBlob = input.currentFocus.label;
  const missionScore = overlap(request, missionBlob);
  const focusScore = overlap(request, focusBlob);
  const mentionsMission = lower.includes(input.mission.title.toLowerCase());
  const mentionsFocus = tokenize(focusBlob).size
    ? [...tokenize(focusBlob)].some((t) => tokenize(request).has(t))
    : false;

  // Ambiguity check before approval — missing necessary information
  if (
    /\b(how|what|which|when|maybe|somehow)\b/i.test(request) &&
    request.split(/\s+/).length < 8
  ) {
    return {
      status: "NEEDS_CLARIFICATION",
      reason:
        "Request may support the Mission, but necessary information is missing or ambiguous.",
      missionRespected: mentionsMission || missionScore >= 0.05,
      focusMaintained: false,
    };
  }

  if (mentionsMission && mentionsFocus && (missionScore >= 0.1 || focusScore >= 0.1)) {
    return {
      status: "APPROVED",
      reason: "Request directly supports the active Mission and Current Focus.",
      missionRespected: true,
      focusMaintained: true,
    };
  }

  if (mentionsMission && focusScore >= 0.15) {
    return {
      status: "APPROVED",
      reason: "Request directly supports the active Mission and Current Focus.",
      missionRespected: true,
      focusMaintained: true,
    };
  }

  if (missionScore >= 0.25 && focusScore >= 0.2) {
    return {
      status: "APPROVED",
      reason: "Request directly supports the active Mission and Current Focus.",
      missionRespected: true,
      focusMaintained: true,
    };
  }

  if (mentionsMission || missionScore >= 0.1) {
    if (focusScore < 0.05 && !mentionsFocus) {
      return {
        status: "NEEDS_CLARIFICATION",
        reason:
          "Request may support the Mission, but its link to Current Focus is missing or ambiguous.",
        missionRespected: true,
        focusMaintained: false,
      };
    }
  }

  if (missionScore < 0.05 && !mentionsMission) {
    return {
      status: "REJECTED",
      reason: "Request does not support the active Mission.",
      missionRespected: false,
      focusMaintained: false,
    };
  }

  return {
    status: "REJECTED",
    reason:
      "Request would move execution away from the Current Focus.",
    missionRespected: missionScore >= 0.05 || mentionsMission,
    focusMaintained: false,
  };
}

/** Legacy alignment classifier used by existing pipeline wiring (unchanged contract). */
const CONFLICT_MARKERS = [
  "ignore the goal",
  "abandon the goal",
  "forget the primary goal",
  "do the opposite",
  "unrelated hobby only",
  "tell me a joke",
  "write me a poem about cats",
];

export function classifyGoalAlignment(
  request: string,
  goal: GoalWithMilestones,
): GoalAlignment {
  const lower = request.toLowerCase();
  for (const marker of CONFLICT_MARKERS) {
    if (lower.includes(marker)) return "CONFLICTING";
  }

  const goalBlob = `${goal.title} ${goal.description} ${goal.milestones
    .map((m) => `${m.title} ${m.acceptanceCriteria}`)
    .join(" ")}`;

  if (lower.includes(goal.title.toLowerCase())) {
    return "DIRECTLY_ALIGNED";
  }

  const score = overlap(request, goalBlob);
  if (score >= 0.25) return "DIRECTLY_ALIGNED";
  if (score >= 0.1) return "SUPPORTING";
  if (score >= 0.05) return "NEUTRAL";
  return "CONFLICTING";
}
