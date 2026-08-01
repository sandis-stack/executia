import { prisma } from "@/lib/prisma";

export type LoadedExecutionMemory = {
  loaded: true;
  priorState: {
    id: string;
    currentObjective: string;
    completedWork: string[];
    remainingWork: string[];
    nextPriorityAction: string;
    executionId: string | null;
  } | null;
  pendingTasks: Array<{ id: string; title: string; description: string | null }>;
  constraints: string[];
  recentDecisions: string[];
  recentErrors: string[];
};

export async function loadExecutionMemory(
  goalId: string,
): Promise<LoadedExecutionMemory> {
  const [prior, pendingTasks, constraints, decisions, errors] =
    await Promise.all([
      prisma.executionState.findFirst({
        where: { goalId, approved: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.pendingTask.findMany({
        where: { goalId, resolved: false },
        orderBy: { createdAt: "asc" },
      }),
      prisma.constraint.findMany({
        where: { goalId, active: true },
      }),
      prisma.decisionRecord.findMany({
        where: { goalId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.errorRecord.findMany({
        where: { goalId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return {
    loaded: true,
    priorState: prior
      ? {
          id: prior.id,
          currentObjective: prior.currentObjective,
          completedWork: prior.completedWork,
          remainingWork: prior.remainingWork,
          nextPriorityAction: prior.nextPriorityAction,
          executionId: prior.executionId,
        }
      : null,
    pendingTasks: pendingTasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
    })),
    constraints: constraints.map((c) => c.text),
    recentDecisions: decisions.map((d) => d.decision),
    recentErrors: errors.map((e) => e.message),
  };
}

export async function updateMemoryAfterApproval(input: {
  goalId: string;
  executionId: string;
  currentObjective: string;
  completedWork: string[];
  remainingWork: string[];
  nextPriorityAction: string;
  decisions: string[];
  summary: string;
}) {
  await prisma.executionState.create({
    data: {
      goalId: input.goalId,
      executionId: input.executionId,
      currentObjective: input.currentObjective,
      completedWork: input.completedWork,
      remainingWork: input.remainingWork,
      nextPriorityAction: input.nextPriorityAction,
      approved: true,
    },
  });

  await prisma.completedExecution.create({
    data: {
      goalId: input.goalId,
      executionId: input.executionId,
      summary: input.summary,
      completedWork: input.completedWork,
      nextPriorityAction: input.nextPriorityAction,
    },
  });

  for (const decision of input.decisions) {
    await prisma.decisionRecord.create({
      data: {
        goalId: input.goalId,
        executionId: input.executionId,
        decision,
      },
    });
  }

  for (const item of input.remainingWork) {
    const existing = await prisma.pendingTask.findFirst({
      where: { goalId: input.goalId, title: item, resolved: false },
    });
    if (!existing) {
      await prisma.pendingTask.create({
        data: {
          goalId: input.goalId,
          title: item,
          description: "From approved execution remaining work",
        },
      });
    }
  }

  for (const item of input.completedWork) {
    await prisma.pendingTask.updateMany({
      where: { goalId: input.goalId, title: item, resolved: false },
      data: { resolved: true },
    });
  }
}

export async function recordErrorMemory(input: {
  goalId: string;
  executionId: string;
  message: string;
  stage: string;
}) {
  await prisma.errorRecord.create({
    data: {
      goalId: input.goalId,
      executionId: input.executionId,
      message: input.message,
      stage: input.stage,
    },
  });
}

export async function recordCorrectionMemory(input: {
  goalId: string;
  executionId: string;
  brief: string;
  outcome: string;
}) {
  await prisma.correctionRecord.create({
    data: {
      goalId: input.goalId,
      executionId: input.executionId,
      brief: input.brief,
      outcome: input.outcome,
    },
  });
}
