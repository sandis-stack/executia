import type { GoalMilestone, PrimaryGoal } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type GoalWithMilestones = PrimaryGoal & { milestones: GoalMilestone[] };

export async function loadPrimaryGoal(
  goalId: string,
): Promise<GoalWithMilestones | null> {
  return prisma.primaryGoal.findUnique({
    where: { id: goalId },
    include: { milestones: { orderBy: { orderIndex: "asc" } } },
  });
}
