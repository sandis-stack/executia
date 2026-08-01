import { describe, expect, it } from "vitest";
import {
  preValidate,
  type PreValidationInput,
} from "@/core/engines/pre-validation-engine";

function validInput(
  overrides: Partial<PreValidationInput> = {},
): PreValidationInput {
  return {
    mission: { id: "mission-1", title: "Establish EXECUTIA Core AI" },
    currentFocus: { label: "Prove PRE Validation" },
    developmentCell: { loaded: true },
    permissions: { available: true, canExecute: true },
    request: "Advance Prove PRE Validation for Establish EXECUTIA Core AI",
    requestAllowed: true,
    ...overrides,
  };
}

describe("PRE Validation (MVP 1.0)", () => {
  it("approves when all required checks pass", () => {
    const result = preValidate(validInput());
    expect(result.status).toBe("APPROVED");
    expect(result.blocked).toBe(false);
    expect(result.checks).toHaveLength(5);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("BLOCKs when Mission is missing", () => {
    const result = preValidate(validInput({ mission: null }));
    expect(result.status).toBe("BLOCKED");
    expect(result.blocked).toBe(true);
    expect(
      result.checks.find((c) => c.id === "MISSION_EXISTS")?.passed,
    ).toBe(false);
  });

  it("BLOCKs when Current Focus is missing", () => {
    const result = preValidate(validInput({ currentFocus: null }));
    expect(result.status).toBe("BLOCKED");
    expect(result.blocked).toBe(true);
    expect(
      result.checks.find((c) => c.id === "CURRENT_FOCUS_EXISTS")?.passed,
    ).toBe(false);
  });

  it("BLOCKs when Development Cell is not loaded", () => {
    const result = preValidate(
      validInput({ developmentCell: { loaded: false } }),
    );
    expect(result.status).toBe("BLOCKED");
    expect(
      result.checks.find((c) => c.id === "DEVELOPMENT_CELL_LOADED")?.passed,
    ).toBe(false);
  });

  it("BLOCKs when Development Cell snapshot is missing", () => {
    const result = preValidate(validInput({ developmentCell: null }));
    expect(result.status).toBe("BLOCKED");
    expect(
      result.checks.find((c) => c.id === "DEVELOPMENT_CELL_LOADED")?.passed,
    ).toBe(false);
  });

  it("BLOCKs when Permissions are unavailable", () => {
    const result = preValidate(
      validInput({ permissions: { available: false, canExecute: false } }),
    );
    expect(result.status).toBe("BLOCKED");
    expect(
      result.checks.find((c) => c.id === "PERMISSIONS_AVAILABLE")?.passed,
    ).toBe(false);
  });

  it("BLOCKs when Permissions snapshot is missing", () => {
    const result = preValidate(validInput({ permissions: null }));
    expect(result.status).toBe("BLOCKED");
    expect(
      result.checks.find((c) => c.id === "PERMISSIONS_AVAILABLE")?.passed,
    ).toBe(false);
  });

  it("BLOCKs when request is not allowed", () => {
    const result = preValidate(validInput({ requestAllowed: false }));
    expect(result.status).toBe("BLOCKED");
    expect(
      result.checks.find((c) => c.id === "REQUEST_ALLOWED")?.passed,
    ).toBe(false);
  });

  it("BLOCKs when request is empty", () => {
    const result = preValidate(validInput({ request: "   " }));
    expect(result.status).toBe("BLOCKED");
    expect(
      result.checks.find((c) => c.id === "REQUEST_ALLOWED")?.passed,
    ).toBe(false);
  });

  it("returns structured validation result with all check ids", () => {
    const result = preValidate(validInput({ mission: null }));
    const ids = result.checks.map((c) => c.id);
    expect(ids).toEqual([
      "MISSION_EXISTS",
      "CURRENT_FOCUS_EXISTS",
      "DEVELOPMENT_CELL_LOADED",
      "PERMISSIONS_AVAILABLE",
      "REQUEST_ALLOWED",
    ]);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.some((r) => r.includes("MISSION_EXISTS"))).toBe(
      true,
    );
  });

  it("does not rewrite the request (no business logic)", () => {
    const result = preValidate(validInput());
    expect(result.correctedRequest).toBeUndefined();
  });
});
