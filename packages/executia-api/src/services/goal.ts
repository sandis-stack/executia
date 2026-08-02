import { prisma } from "@executia/core-ai";

export { prisma };

/**
 * PrimaryGoal.title is what Core POST Validation substring-matches in the AI answer.
 * Long mission statements are preserved in description; the enforceable title must be
 * a phrase a valid mission-aligned answer naturally contains.
 */
export function resolveEnforcedMissionTitle(mission: string): string {
  const trimmed = mission.trim();
  if (!trimmed) return trimmed;

  // Named product mission statements → enforceable Core title is the product name.
  if (/\bEXECUTIA Core\b/i.test(trimmed) && trimmed.length > "EXECUTIA Core".length) {
    return "EXECUTIA Core";
  }
  return trimmed;
}

/**
 * Resolve or create PrimaryGoal so Core can run unchanged.
 * Does not invent Development Cell content.
 */
export async function ensureMissionGoal(input: {
  mission: string;
  currentGoal: string;
  currentFocus: string;
}) {
  const enforcedTitle = resolveEnforcedMissionTitle(input.mission);
  const description = [
    `Mission statement: ${input.mission.trim()}`,
    `Current goal: ${input.currentGoal.trim()}`,
  ].join("\n");

  const existing = await prisma.primaryGoal.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ title: enforcedTitle }, { title: input.mission.trim() }],
    },
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    const needsUpdate =
      existing.title !== enforcedTitle ||
      existing.currentPhase !== input.currentFocus ||
      existing.description !== description;
    if (needsUpdate) {
      return prisma.primaryGoal.update({
        where: { id: existing.id },
        data: {
          title: enforcedTitle,
          description,
          currentPhase: input.currentFocus,
        },
      });
    }
    return existing;
  }

  return prisma.primaryGoal.create({
    data: {
      title: enforcedTitle,
      description,
      currentPhase: input.currentFocus,
      milestones: {
        create: [
          {
            title: input.currentFocus,
            acceptanceCriteria: `Advance ${input.currentFocus}`,
            weight: 1,
            orderIndex: 0,
            status: "IN_PROGRESS",
          },
        ],
      },
    },
  });
}
