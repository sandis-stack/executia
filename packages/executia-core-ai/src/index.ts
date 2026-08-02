/**
 * EXECUTIA Core AI — public library surface.
 *
 * User-facing verified responses are produced only via ResponseGate
 * inside executeCoreRequest.
 */
export { executeCoreRequest, CORE_PUBLIC_DELIVERY } from "@/core/run-core-execution";
export {
  preValidate,
  type PreValidationInput,
  type PreValidationOutcome,
  type PreValidationCheckResult,
} from "@/core/engines/pre-validation-engine";
export {
  validateFocus,
  classifyGoalAlignment,
  type FocusValidationInput,
  type FocusValidationResult,
  type FocusValidationStatus,
} from "@/core/engines/focus-engine";
export {
  loadDevelopmentCell,
  applyDevelopmentUpdate,
  type DevelopmentCellContext,
  type DevelopmentCellLoadResult,
} from "@/core/engines/development-cell";
export { deliverThroughResponseGate, RESPONSE_GATE_MARKER } from "@/core/gate/response-gate";
export {
  FakeAIProviderAdapter,
  OpenAICompatibleAdapter,
  createConfiguredProvider,
  type AIProviderAdapter,
  type ProviderCallResult,
} from "@/core/providers/ai-provider-adapter";
export {
  runAiExecutor,
  type AiExecutorInput,
  type AiExecutorResult,
} from "@/core/providers/ai-executor";
export { runPostValidation } from "@/core/engines/post-validation-engine";
export {
  calculateExecutionProgress,
  calculateProgress,
  type ExecutionProgress,
} from "@/core/engines/progress-engine";
export { buildUserResponse } from "@/core/report/report-builder";
export { requireConstitution, ensureConstitutionLoaded } from "@/core/constitution/load";
export { CONSTITUTION_VERSION, CONSTITUTION_LAWS } from "@/core/constitution/laws";
export { assertConstitutionImmutable } from "@/core/engines/law-engine";
export { prisma } from "@/lib/prisma";
export type {
  CoreRequest,
  VerifiedCoreResponse,
  ExecutiaReport,
  ExecutionSpec,
  ProviderResponse,
} from "@/domain/schemas";
export { ProviderResponseSchema } from "@/domain/schemas";
