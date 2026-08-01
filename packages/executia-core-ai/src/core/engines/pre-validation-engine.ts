import type { PreValidationStatus } from "@/domain/schemas";

/**
 * EXECUTIA Core MVP 1.0 — PRE Validation
 *
 * Independent gate. No business logic. No AI call.
 * Failure ⇒ BLOCK (status BLOCKED). Execution must stop.
 */

export type PreValidationCheckId =
  | "MISSION_EXISTS"
  | "CURRENT_FOCUS_EXISTS"
  | "DEVELOPMENT_CELL_LOADED"
  | "PERMISSIONS_AVAILABLE"
  | "REQUEST_ALLOWED";

export type PreValidationCheckResult = {
  id: PreValidationCheckId;
  passed: boolean;
  message: string;
};

/** Snapshot inputs — PRE only verifies presence / allow flags. */
export type PreValidationInput = {
  mission: { id: string; title: string } | null;
  currentFocus: { label: string } | null;
  developmentCell: { loaded: boolean } | null;
  permissions: { available: boolean; canExecute: boolean } | null;
  request: string;
  /** Explicit allow flag from upstream; false ⇒ request not allowed. */
  requestAllowed: boolean;
};

export type PreValidationOutcome = {
  /** APPROVED or BLOCKED (BLOCK). */
  status: Extract<PreValidationStatus, "APPROVED" | "BLOCKED">;
  /** True when status is BLOCKED. */
  blocked: boolean;
  checks: PreValidationCheckResult[];
  reasons: string[];
  /** Preserved for API compatibility; PRE MVP does not rewrite requests. */
  correctedRequest?: undefined;
};

function checkMission(
  mission: PreValidationInput["mission"],
): PreValidationCheckResult {
  if (mission && mission.id.trim() && mission.title.trim()) {
    return {
      id: "MISSION_EXISTS",
      passed: true,
      message: "Mission exists.",
    };
  }
  return {
    id: "MISSION_EXISTS",
    passed: false,
    message: "Mission missing.",
  };
}

function checkCurrentFocus(
  currentFocus: PreValidationInput["currentFocus"],
): PreValidationCheckResult {
  if (currentFocus && currentFocus.label.trim()) {
    return {
      id: "CURRENT_FOCUS_EXISTS",
      passed: true,
      message: "Current Focus exists.",
    };
  }
  return {
    id: "CURRENT_FOCUS_EXISTS",
    passed: false,
    message: "Current Focus missing.",
  };
}

function checkDevelopmentCell(
  developmentCell: PreValidationInput["developmentCell"],
): PreValidationCheckResult {
  if (developmentCell && developmentCell.loaded === true) {
    return {
      id: "DEVELOPMENT_CELL_LOADED",
      passed: true,
      message: "Development Cell loaded.",
    };
  }
  return {
    id: "DEVELOPMENT_CELL_LOADED",
    passed: false,
    message: "Development Cell not loaded.",
  };
}

function checkPermissions(
  permissions: PreValidationInput["permissions"],
): PreValidationCheckResult {
  if (
    permissions &&
    permissions.available === true &&
    permissions.canExecute === true
  ) {
    return {
      id: "PERMISSIONS_AVAILABLE",
      passed: true,
      message: "Permissions available.",
    };
  }
  return {
    id: "PERMISSIONS_AVAILABLE",
    passed: false,
    message: "Permissions unavailable.",
  };
}

function checkRequestAllowed(
  request: string,
  requestAllowed: boolean,
): PreValidationCheckResult {
  if (!requestAllowed) {
    return {
      id: "REQUEST_ALLOWED",
      passed: false,
      message: "Request not allowed.",
    };
  }
  if (!request.trim()) {
    return {
      id: "REQUEST_ALLOWED",
      passed: false,
      message: "Request empty — not allowed.",
    };
  }
  return {
    id: "REQUEST_ALLOWED",
    passed: true,
    message: "Request allowed.",
  };
}

/**
 * Run PRE Validation.
 * Returns structured result. Does not call the AI Executor.
 */
export function preValidate(input: PreValidationInput): PreValidationOutcome {
  const checks: PreValidationCheckResult[] = [
    checkMission(input.mission),
    checkCurrentFocus(input.currentFocus),
    checkDevelopmentCell(input.developmentCell),
    checkPermissions(input.permissions),
    checkRequestAllowed(input.request, input.requestAllowed),
  ];

  const failed = checks.filter((c) => !c.passed);
  if (failed.length > 0) {
    return {
      status: "BLOCKED",
      blocked: true,
      checks,
      reasons: failed.map((c) => `${c.id}: ${c.message}`),
    };
  }

  return {
    status: "APPROVED",
    blocked: false,
    checks,
    reasons: checks.map((c) => `${c.id}: ${c.message}`),
  };
}
