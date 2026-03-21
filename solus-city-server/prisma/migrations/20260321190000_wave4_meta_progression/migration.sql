ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "prestigePoints" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "PrestigeHistory" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "fromPrestige" INTEGER NOT NULL,
  "toPrestige" INTEGER NOT NULL,
  "seasonId" TEXT,
  "grantedBonusJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrestigeHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PrestigeHistory_userId_createdAt_idx" ON "PrestigeHistory"("userId", "createdAt");
ALTER TABLE "PrestigeHistory" ADD CONSTRAINT "PrestigeHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrestigeHistory" ADD CONSTRAINT "PrestigeHistory_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ChampionshipSeason" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChampionshipSeason_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ChampionshipSeason_seasonId_key" ON "ChampionshipSeason"("seasonId");
ALTER TABLE "ChampionshipSeason" ADD CONSTRAINT "ChampionshipSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ChampionshipEntry" (
  "id" TEXT NOT NULL,
  "championshipSeasonId" TEXT NOT NULL,
  "syndicateId" TEXT NOT NULL,
  "seed" INTEGER NOT NULL,
  "qualifyingPoints" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChampionshipEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ChampionshipEntry_championshipSeasonId_syndicateId_key" ON "ChampionshipEntry"("championshipSeasonId", "syndicateId");
ALTER TABLE "ChampionshipEntry" ADD CONSTRAINT "ChampionshipEntry_championshipSeasonId_fkey" FOREIGN KEY ("championshipSeasonId") REFERENCES "ChampionshipSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChampionshipEntry" ADD CONSTRAINT "ChampionshipEntry_syndicateId_fkey" FOREIGN KEY ("syndicateId") REFERENCES "Syndicate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ChampionshipMatch" (
  "id" TEXT NOT NULL,
  "championshipSeasonId" TEXT NOT NULL,
  "round" INTEGER NOT NULL,
  "syndicateAId" TEXT NOT NULL,
  "syndicateBId" TEXT NOT NULL,
  "scoreA" INTEGER NOT NULL DEFAULT 0,
  "scoreB" INTEGER NOT NULL DEFAULT 0,
  "winnerSyndicateId" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChampionshipMatch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ChampionshipMatch_championshipSeasonId_round_status_idx" ON "ChampionshipMatch"("championshipSeasonId", "round", "status");
ALTER TABLE "ChampionshipMatch" ADD CONSTRAINT "ChampionshipMatch_championshipSeasonId_fkey" FOREIGN KEY ("championshipSeasonId") REFERENCES "ChampionshipSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChampionshipMatch" ADD CONSTRAINT "ChampionshipMatch_syndicateAId_fkey" FOREIGN KEY ("syndicateAId") REFERENCES "Syndicate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChampionshipMatch" ADD CONSTRAINT "ChampionshipMatch_syndicateBId_fkey" FOREIGN KEY ("syndicateBId") REFERENCES "Syndicate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChampionshipMatch" ADD CONSTRAINT "ChampionshipMatch_winnerSyndicateId_fkey" FOREIGN KEY ("winnerSyndicateId") REFERENCES "Syndicate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "HallOfFameEntry" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "userId" TEXT,
  "syndicateId" TEXT,
  "rank" INTEGER NOT NULL,
  "displayJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HallOfFameEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "HallOfFameEntry_seasonId_category_rank_idx" ON "HallOfFameEntry"("seasonId", "category", "rank");
ALTER TABLE "HallOfFameEntry" ADD CONSTRAINT "HallOfFameEntry_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HallOfFameEntry" ADD CONSTRAINT "HallOfFameEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HallOfFameEntry" ADD CONSTRAINT "HallOfFameEntry_syndicateId_fkey" FOREIGN KEY ("syndicateId") REFERENCES "Syndicate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

