-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PreValidationStatus" AS ENUM ('APPROVED', 'CORRECTED', 'REQUIRES_CLARIFICATION', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PostValidationStatus" AS ENUM ('APPROVED', 'APPROVED_WITH_WARNINGS', 'REQUIRES_CORRECTION', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'PRE_BLOCKED', 'CLARIFICATION_REQUIRED', 'RUNNING', 'APPROVED', 'APPROVED_WITH_WARNINGS', 'BLOCKED', 'PROVIDER_FAILED');

-- CreateEnum
CREATE TYPE "GoalAlignment" AS ENUM ('DIRECTLY_ALIGNED', 'SUPPORTING', 'NEUTRAL', 'CONFLICTING');

-- CreateEnum
CREATE TYPE "DevelopmentCellStatus" AS ENUM ('NO_CHANGE', 'PROPOSED', 'REQUIRES_APPROVAL');

-- CreateTable
CREATE TABLE "ConstitutionVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "lawsJson" JSONB NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConstitutionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrimaryGoal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPhase" TEXT NOT NULL DEFAULT 'Define',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrimaryGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalMilestone" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "acceptanceCriteria" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "orderIndex" INTEGER NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "evidence" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionRequest" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "constitutionVersionId" TEXT,
    "requestText" TEXT NOT NULL,
    "contextJson" JSONB NOT NULL DEFAULT '{}',
    "currentTask" TEXT,
    "goalAlignment" "GoalAlignment",
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreValidationResult" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "status" "PreValidationStatus" NOT NULL,
    "reasons" TEXT[],
    "correctedRequest" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreValidationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionSpecification" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "specJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIExecution" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "attemptIndex" INTEGER NOT NULL DEFAULT 0,
    "requestPayload" JSONB NOT NULL,
    "rawResponse" TEXT,
    "parsedJson" JSONB,
    "errorMessage" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostValidationResult" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "attemptIndex" INTEGER NOT NULL DEFAULT 0,
    "status" "PostValidationStatus" NOT NULL,
    "reasons" TEXT[],
    "warnings" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostValidationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionAttempt" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "aiExecutionId" TEXT,
    "attemptIndex" INTEGER NOT NULL,
    "failureReasons" TEXT[],
    "correctionBrief" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorrectionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifiedResponse" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL,
    "responseText" TEXT NOT NULL,
    "reportJson" JSONB NOT NULL,
    "ledgerOk" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifiedResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionRecord" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "executionId" TEXT,
    "decision" TEXT NOT NULL,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompletedExecution" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "completedWork" TEXT[],
    "nextPriorityAction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompletedExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingTask" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Constraint" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Constraint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorRecord" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "executionId" TEXT,
    "message" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionRecord" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "executionId" TEXT,
    "brief" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorrectionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevelopmentProposal" (
    "id" TEXT NOT NULL,
    "constitutionVersionId" TEXT NOT NULL,
    "goalId" TEXT,
    "executionId" TEXT,
    "finding" TEXT NOT NULL,
    "proposal" TEXT,
    "status" "DevelopmentCellStatus" NOT NULL DEFAULT 'NO_CHANGE',
    "observedFailure" TEXT,
    "repeatedPattern" TEXT,
    "missingRule" TEXT,
    "evidence" TEXT,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevelopmentProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionState" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "executionId" TEXT,
    "currentObjective" TEXT NOT NULL,
    "completedWork" TEXT[],
    "remainingWork" TEXT[],
    "nextPriorityAction" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConstitutionVersion_version_key" ON "ConstitutionVersion"("version");

-- CreateIndex
CREATE INDEX "GoalMilestone_goalId_orderIndex_idx" ON "GoalMilestone"("goalId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "PreValidationResult_executionId_key" ON "PreValidationResult"("executionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionSpecification_executionId_key" ON "ExecutionSpecification"("executionId");

-- CreateIndex
CREATE INDEX "AIExecution_executionId_attemptIndex_idx" ON "AIExecution"("executionId", "attemptIndex");

-- CreateIndex
CREATE INDEX "PostValidationResult_executionId_attemptIndex_idx" ON "PostValidationResult"("executionId", "attemptIndex");

-- CreateIndex
CREATE INDEX "CorrectionAttempt_executionId_attemptIndex_idx" ON "CorrectionAttempt"("executionId", "attemptIndex");

-- CreateIndex
CREATE UNIQUE INDEX "VerifiedResponse_executionId_key" ON "VerifiedResponse"("executionId");

-- CreateIndex
CREATE UNIQUE INDEX "CompletedExecution_executionId_key" ON "CompletedExecution"("executionId");

-- CreateIndex
CREATE INDEX "ExecutionState_goalId_createdAt_idx" ON "ExecutionState"("goalId", "createdAt");

-- AddForeignKey
ALTER TABLE "GoalMilestone" ADD CONSTRAINT "GoalMilestone_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "PrimaryGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRequest" ADD CONSTRAINT "ExecutionRequest_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "PrimaryGoal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRequest" ADD CONSTRAINT "ExecutionRequest_constitutionVersionId_fkey" FOREIGN KEY ("constitutionVersionId") REFERENCES "ConstitutionVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreValidationResult" ADD CONSTRAINT "PreValidationResult_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ExecutionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionSpecification" ADD CONSTRAINT "ExecutionSpecification_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ExecutionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIExecution" ADD CONSTRAINT "AIExecution_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ExecutionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostValidationResult" ADD CONSTRAINT "PostValidationResult_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ExecutionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionAttempt" ADD CONSTRAINT "CorrectionAttempt_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ExecutionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionAttempt" ADD CONSTRAINT "CorrectionAttempt_aiExecutionId_fkey" FOREIGN KEY ("aiExecutionId") REFERENCES "AIExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiedResponse" ADD CONSTRAINT "VerifiedResponse_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ExecutionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionRecord" ADD CONSTRAINT "DecisionRecord_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "PrimaryGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionRecord" ADD CONSTRAINT "DecisionRecord_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ExecutionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletedExecution" ADD CONSTRAINT "CompletedExecution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "PrimaryGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletedExecution" ADD CONSTRAINT "CompletedExecution_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ExecutionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingTask" ADD CONSTRAINT "PendingTask_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "PrimaryGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Constraint" ADD CONSTRAINT "Constraint_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "PrimaryGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorRecord" ADD CONSTRAINT "ErrorRecord_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "PrimaryGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorRecord" ADD CONSTRAINT "ErrorRecord_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ExecutionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRecord" ADD CONSTRAINT "CorrectionRecord_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "PrimaryGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRecord" ADD CONSTRAINT "CorrectionRecord_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ExecutionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentProposal" ADD CONSTRAINT "DevelopmentProposal_constitutionVersionId_fkey" FOREIGN KEY ("constitutionVersionId") REFERENCES "ConstitutionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentProposal" ADD CONSTRAINT "DevelopmentProposal_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "PrimaryGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevelopmentProposal" ADD CONSTRAINT "DevelopmentProposal_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ExecutionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionState" ADD CONSTRAINT "ExecutionState_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "PrimaryGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionState" ADD CONSTRAINT "ExecutionState_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ExecutionRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
