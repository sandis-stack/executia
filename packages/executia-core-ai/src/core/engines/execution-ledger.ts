import type {
  ExecutionStatus,
  ExecutionSpec,
  GoalAlignment,
  PostValidationStatus,
  PreValidationStatus,
  ProviderResponse,
  ExecutiaReport,
} from "@/domain/schemas";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function createExecutionRequest(input: {
  goalId: string;
  constitutionVersionId: string;
  requestText: string;
  context: Record<string, unknown>;
  currentTask?: string;
  goalAlignment?: GoalAlignment;
}) {
  return prisma.executionRequest.create({
    data: {
      goalId: input.goalId,
      constitutionVersionId: input.constitutionVersionId,
      requestText: input.requestText,
      contextJson: input.context as Prisma.InputJsonValue,
      currentTask: input.currentTask,
      goalAlignment: input.goalAlignment,
      status: "PENDING",
    },
  });
}

export async function recordPreValidation(
  executionId: string,
  data: {
    status: PreValidationStatus;
    reasons: string[];
    correctedRequest?: string;
  },
) {
  return prisma.preValidationResult.create({
    data: {
      executionId,
      status: data.status,
      reasons: data.reasons,
      correctedRequest: data.correctedRequest,
    },
  });
}

export async function recordSpecification(
  executionId: string,
  spec: ExecutionSpec,
) {
  return prisma.executionSpecification.create({
    data: {
      executionId,
      specJson: spec as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function recordAIExecution(input: {
  executionId: string;
  provider: string;
  model: string;
  attemptIndex: number;
  requestPayload: Record<string, unknown>;
  rawResponse?: string;
  parsed?: ProviderResponse | null;
  errorMessage?: string;
  latencyMs?: number;
}) {
  return prisma.aIExecution.create({
    data: {
      executionId: input.executionId,
      provider: input.provider,
      model: input.model,
      attemptIndex: input.attemptIndex,
      requestPayload: input.requestPayload as Prisma.InputJsonValue,
      rawResponse: input.rawResponse,
      parsedJson: (input.parsed ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
      errorMessage: input.errorMessage,
      latencyMs: input.latencyMs,
    },
  });
}

export async function recordPostValidation(
  executionId: string,
  attemptIndex: number,
  data: {
    status: PostValidationStatus;
    reasons: string[];
    warnings: string[];
  },
) {
  return prisma.postValidationResult.create({
    data: {
      executionId,
      attemptIndex,
      status: data.status,
      reasons: data.reasons,
      warnings: data.warnings,
    },
  });
}

export async function recordCorrectionAttempt(input: {
  executionId: string;
  attemptIndex: number;
  failureReasons: string[];
  correctionBrief: string;
}) {
  return prisma.correctionAttempt.create({
    data: {
      executionId: input.executionId,
      attemptIndex: input.attemptIndex,
      failureReasons: input.failureReasons,
      correctionBrief: input.correctionBrief,
    },
  });
}

export async function recordVerifiedResponse(input: {
  executionId: string;
  status: ExecutionStatus;
  responseText: string;
  report: ExecutiaReport;
  ledgerOk: boolean;
}) {
  return prisma.verifiedResponse.create({
    data: {
      executionId: input.executionId,
      status: input.status,
      responseText: input.responseText,
      reportJson: input.report as unknown as Prisma.InputJsonValue,
      ledgerOk: input.ledgerOk,
    },
  });
}

export async function setExecutionStatus(
  executionId: string,
  status: ExecutionStatus,
) {
  return prisma.executionRequest.update({
    where: { id: executionId },
    data: { status },
  });
}

export async function assertLedgerWritten(executionId: string): Promise<boolean> {
  const exec = await prisma.executionRequest.findUnique({
    where: { id: executionId },
    include: {
      preValidation: true,
      verifiedResponse: true,
    },
  });
  return Boolean(exec?.preValidation && exec.verifiedResponse?.ledgerOk);
}
