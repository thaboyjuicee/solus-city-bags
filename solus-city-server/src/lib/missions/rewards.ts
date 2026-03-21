import { Prisma, PlayerMission } from "@prisma/client";
import { progressPlayerMissions } from "./progress";
import { awardSeasonScore } from "../seasons/scoring";

export function assertClaimableMission(mission: Pick<PlayerMission, "completed" | "claimed">) {
  if (!mission.completed) {
    throw new Error("Mission is not complete yet");
  }
  if (mission.claimed) {
    throw new Error("Mission reward already claimed");
  }
}

export async function claimMissionReward(
  prisma: Prisma.TransactionClient,
  userId: string,
  playerMissionId: string,
  now: Date = new Date()
) {
  const mission = await prisma.playerMission.findUnique({
    where: { id: playerMissionId },
    include: { missionDefinition: { include: { rewardItem: true } } },
  });

  if (!mission || mission.userId !== userId) {
    throw new Error("Mission not found");
  }

  assertClaimableMission(mission);

  const rewardCash = mission.missionDefinition.rewardCash;
  const rewardRp = mission.missionDefinition.rewardRp;
  const rewardItem = mission.missionDefinition.rewardItem;

  const [updatedMission, updatedProfile] = await Promise.all([
    prisma.playerMission.update({
      where: { id: mission.id },
      data: { claimed: true },
      include: { missionDefinition: true },
    }),
    prisma.profile.update({
      where: { userId },
      data: {
        cash: { increment: rewardCash },
        rp: { increment: rewardRp },
      },
    }),
  ]);

  if (rewardItem) {
    await prisma.inventory.upsert({
      where: { userId_itemId: { userId, itemId: rewardItem.id } },
      update: { qty: { increment: 1 }, sourceType: "mission_reward" },
      create: { userId, itemId: rewardItem.id, qty: 1, sourceType: "mission_reward" },
    });
  }

  await prisma.eventLog.create({
    data: {
      userId,
      type: "mission_claim",
      message: `Claimed mission reward: ${mission.missionDefinition.name}`,
      metadata: {
        missionId: mission.id,
        code: mission.missionDefinition.code,
        rewardCash,
        rewardRp,
        rewardItem: rewardItem?.name ?? null,
      },
    },
  });

  if (mission.missionDefinition.type === "daily") {
    await progressPlayerMissions(prisma, userId, [{ goalType: "daily_claim", amount: 1 }], now);
  }

  const season = await awardSeasonScore(prisma, { userId, category: "mission_claim", amount: 1 }, now);

  return {
    mission: updatedMission,
    rewards: {
      cash: rewardCash,
      rp: rewardRp,
      item: rewardItem ? { id: rewardItem.id, name: rewardItem.name } : null,
    },
    profile: updatedProfile,
    seasonPointsGained: season.pointsGained,
  };
}
