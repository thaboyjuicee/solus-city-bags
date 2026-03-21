ALTER TABLE "Syndicate"
  ADD COLUMN "vaultCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "seasonPoints" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "territoryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "warRating" INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN "safehouseLevel" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "SyndicateMember"
  ADD COLUMN "contributionScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "warParticipation" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "Territory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "bonusType" TEXT NOT NULL,
  "bonusValue" DOUBLE PRECISION NOT NULL,
  "incomeType" TEXT,
  "sortOrder" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Territory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Territory_code_key" ON "Territory"("code");

CREATE TABLE "TerritoryControl" (
  "id" TEXT NOT NULL,
  "territoryId" TEXT NOT NULL,
  "syndicateId" TEXT NOT NULL,
  "influence" INTEGER NOT NULL DEFAULT 0,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "lastDefendedAt" TIMESTAMP(3) NOT NULL,
  "decayState" TEXT NOT NULL DEFAULT 'stable',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TerritoryControl_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TerritoryControl_territoryId_key" ON "TerritoryControl"("territoryId");
ALTER TABLE "TerritoryControl" ADD CONSTRAINT "TerritoryControl_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TerritoryControl" ADD CONSTRAINT "TerritoryControl_syndicateId_fkey" FOREIGN KEY ("syndicateId") REFERENCES "Syndicate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TerritoryContribution" (
  "id" TEXT NOT NULL,
  "territoryId" TEXT NOT NULL,
  "syndicateId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "influenceDelta" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TerritoryContribution_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TerritoryContribution_territoryId_createdAt_idx" ON "TerritoryContribution"("territoryId", "createdAt");
CREATE INDEX "TerritoryContribution_syndicateId_createdAt_idx" ON "TerritoryContribution"("syndicateId", "createdAt");
ALTER TABLE "TerritoryContribution" ADD CONSTRAINT "TerritoryContribution_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TerritoryContribution" ADD CONSTRAINT "TerritoryContribution_syndicateId_fkey" FOREIGN KEY ("syndicateId") REFERENCES "Syndicate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TerritoryContribution" ADD CONSTRAINT "TerritoryContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SyndicateWar" (
  "id" TEXT NOT NULL,
  "attackerSyndicateId" TEXT NOT NULL,
  "defenderSyndicateId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "attackerScore" INTEGER NOT NULL DEFAULT 0,
  "defenderScore" INTEGER NOT NULL DEFAULT 0,
  "territoryId" TEXT,
  "winnerSyndicateId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyndicateWar_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SyndicateWar" ADD CONSTRAINT "SyndicateWar_attackerSyndicateId_fkey" FOREIGN KEY ("attackerSyndicateId") REFERENCES "Syndicate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SyndicateWar" ADD CONSTRAINT "SyndicateWar_defenderSyndicateId_fkey" FOREIGN KEY ("defenderSyndicateId") REFERENCES "Syndicate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SyndicateWar" ADD CONSTRAINT "SyndicateWar_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SyndicateWar" ADD CONSTRAINT "SyndicateWar_winnerSyndicateId_fkey" FOREIGN KEY ("winnerSyndicateId") REFERENCES "Syndicate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "SyndicateWarAction" (
  "id" TEXT NOT NULL,
  "warId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "syndicateId" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyndicateWarAction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SyndicateWarAction_warId_createdAt_idx" ON "SyndicateWarAction"("warId", "createdAt");
ALTER TABLE "SyndicateWarAction" ADD CONSTRAINT "SyndicateWarAction_warId_fkey" FOREIGN KEY ("warId") REFERENCES "SyndicateWar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SyndicateWarAction" ADD CONSTRAINT "SyndicateWarAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SyndicateWarAction" ADD CONSTRAINT "SyndicateWarAction_syndicateId_fkey" FOREIGN KEY ("syndicateId") REFERENCES "Syndicate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
