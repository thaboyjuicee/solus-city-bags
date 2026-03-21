ALTER TABLE "Profile"
  ADD COLUMN "seasonScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "availablePerkPoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "prestigeLevel" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Item"
  ADD COLUMN "slot" TEXT,
  ADD COLUMN "tradable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "maxStack" INTEGER;

ALTER TABLE "Inventory"
  ADD COLUMN "equipped" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "durability" INTEGER;

CREATE TABLE "PerkDefinition" (
  "id" TEXT NOT NULL,
  "branch" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "effectType" TEXT NOT NULL,
  "effectValue" DOUBLE PRECISION NOT NULL,
  "tier" INTEGER NOT NULL,
  "prerequisitePerkId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "PerkDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PerkDefinition_code_key" ON "PerkDefinition"("code");

ALTER TABLE "PerkDefinition"
  ADD CONSTRAINT "PerkDefinition_prerequisitePerkId_fkey"
  FOREIGN KEY ("prerequisitePerkId") REFERENCES "PerkDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PlayerPerk" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "perkDefinitionId" TEXT NOT NULL,
  "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlayerPerk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerPerk_userId_perkDefinitionId_key" ON "PlayerPerk"("userId", "perkDefinitionId");

ALTER TABLE "PlayerPerk"
  ADD CONSTRAINT "PlayerPerk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerPerk"
  ADD CONSTRAINT "PlayerPerk_perkDefinitionId_fkey" FOREIGN KEY ("perkDefinitionId") REFERENCES "PerkDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "RevengeMark" (
  "id" TEXT NOT NULL,
  "victimUserId" TEXT NOT NULL,
  "attackerUserId" TEXT NOT NULL,
  "battleId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "bonusPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RevengeMark_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RevengeMark_victimUserId_active_idx" ON "RevengeMark"("victimUserId", "active");
CREATE INDEX "RevengeMark_attackerUserId_active_idx" ON "RevengeMark"("attackerUserId", "active");

ALTER TABLE "RevengeMark"
  ADD CONSTRAINT "RevengeMark_victimUserId_fkey" FOREIGN KEY ("victimUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RevengeMark"
  ADD CONSTRAINT "RevengeMark_attackerUserId_fkey" FOREIGN KEY ("attackerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Season" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "rewardJson" JSONB,
  "prestigeEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SeasonParticipation" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "pvpScore" INTEGER NOT NULL DEFAULT 0,
  "crimeScore" INTEGER NOT NULL DEFAULT 0,
  "missionScore" INTEGER NOT NULL DEFAULT 0,
  "finalRank" INTEGER,
  "rewardClaimed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SeasonParticipation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeasonParticipation_seasonId_userId_key" ON "SeasonParticipation"("seasonId", "userId");

ALTER TABLE "SeasonParticipation"
  ADD CONSTRAINT "SeasonParticipation_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SeasonParticipation"
  ADD CONSTRAINT "SeasonParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SeasonLeaderboardSnapshot" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "userId" TEXT,
  "rank" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeasonLeaderboardSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SeasonLeaderboardSnapshot_seasonId_category_capturedAt_idx"
  ON "SeasonLeaderboardSnapshot"("seasonId", "category", "capturedAt");

ALTER TABLE "SeasonLeaderboardSnapshot"
  ADD CONSTRAINT "SeasonLeaderboardSnapshot_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SeasonLeaderboardSnapshot"
  ADD CONSTRAINT "SeasonLeaderboardSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
