import { Prisma } from "@prisma/client";

type MissionProgressStep = {
  goalType: string;
  amount?: number;
};

export type MissionProgressUpdate = {
  id: string;
  code: string;
  name: string;
  progress: number;
  goalValue: number;
  completed: boolean;
  claimed: boolean;
  type: string;
};

export async function progressPlayerMissions(
  tx: Prisma.TransactionClient,
  userId: string,
  steps: MissionProgressStep[],
  now: Date = new Date()
): Promise<MissionProgressUpdate[]> {
  if (steps.length === 0) return [];

  const incrementByGoalType = new Map<string, number>();
  for (const step of steps) {
    incrementByGoalType.set(step.goalType, (incrementByGoalType.get(step.goalType) ?? 0) + (step.amount ?? 1));
  }

  const missions = await tx.playerMission.findMany({
    where: {
      userId,
      claimed: false,
      endsAt: { gt: now },
      startsAt: { lte: now },
    },
    include: { missionDefinition: true },
  });

  const updates: MissionProgressUpdate[] = [];

  for (const mission of missions) {
    if (mission.completed) continue;
    const amount = incrementByGoalType.get(mission.missionDefinition.goalType) ?? 0;
    if (amount <= 0) continue;

    const progress = Math.min(mission.progress + amount, mission.missionDefinition.goalValue);
    const completed = progress >= mission.missionDefinition.goalValue;

    const updated = await tx.playerMission.update({
      where: { id: mission.id },
      data: { progress, completed },
      include: { missionDefinition: true },
    });

    updates.push({
      id: updated.id,
      code: updated.missionDefinition.code,
      name: updated.missionDefinition.name,
      progress: updated.progress,
      goalValue: updated.missionDefinition.goalValue,
      completed: updated.completed,
      claimed: updated.claimed,
      type: updated.missionDefinition.type,
    });
  }

  return updates;
}
