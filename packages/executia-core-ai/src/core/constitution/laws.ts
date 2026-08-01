/** Machine-readable EXECUTIA Constitution laws — version core-ai-1.0.0 */

export const CONSTITUTION_VERSION = "core-ai-1.0.0";

export type LawId =
  | "GOAL"
  | "FOCUS"
  | "EXECUTION"
  | "VALIDATION"
  | "MEMORY"
  | "TRUTH"
  | "PROGRESS"
  | "CONTINUITY"
  | "DEVELOPMENT_CELL"
  | "REPORTING";

export type ConstitutionLaw = {
  id: LawId;
  name: string;
  statement: string;
};

export const CONSTITUTION_LAWS: ConstitutionLaw[] = [
  {
    id: "GOAL",
    name: "GOAL LAW",
    statement:
      "The primary goal must always be loaded and present during execution.",
  },
  {
    id: "FOCUS",
    name: "FOCUS LAW",
    statement:
      "Every request must be classified as DIRECTLY_ALIGNED, SUPPORTING, NEUTRAL, or CONFLICTING.",
  },
  {
    id: "EXECUTION",
    name: "EXECUTION LAW",
    statement:
      "The AI must move work toward a concrete result and identify the next executable action.",
  },
  {
    id: "VALIDATION",
    name: "VALIDATION LAW",
    statement:
      "No response may be delivered without successful pre-validation and post-validation.",
  },
  {
    id: "MEMORY",
    name: "MEMORY LAW",
    statement:
      "The system must persist goal, objective, decisions, work, constraints, errors, corrections, proposals, and next action.",
  },
  {
    id: "TRUTH",
    name: "TRUTH LAW",
    statement:
      "The system must not invent facts, execution results, evidence, or progress.",
  },
  {
    id: "PROGRESS",
    name: "PROGRESS LAW",
    statement:
      "Progress must be calculated only from explicit milestones, weights, acceptance criteria, and evidence.",
  },
  {
    id: "CONTINUITY",
    name: "CONTINUITY LAW",
    statement:
      "Every new execution must continue from the latest approved execution state.",
  },
  {
    id: "DEVELOPMENT_CELL",
    name: "DEVELOPMENT CELL LAW",
    statement:
      "Every execution must produce a Development Cell assessment. Proposals must not silently modify the Constitution.",
  },
  {
    id: "REPORTING",
    name: "REPORTING LAW",
    statement:
      "Every delivered response must include the mandatory EXECUTIA Execution Report.",
  },
];

export type LoadedConstitution = {
  version: string;
  laws: ConstitutionLaw[];
  locked: true;
  dbId: string;
};

export function getConstitutionPayload() {
  return {
    version: CONSTITUTION_VERSION,
    laws: CONSTITUTION_LAWS,
  };
}
