ALTER TABLE "Profile"
  ADD COLUMN "heat" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "wantedTier" TEXT NOT NULL DEFAULT 'low',
  ADD COLUMN "vaultCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "lastHeatDecayAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "hospitalExitPenaltyUntil" TIMESTAMP(3),
  ADD COLUMN "hospitalExitPenaltyType" TEXT;

ALTER TABLE "AttackLog"
  ADD COLUMN "cashStolen" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "heatChange" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "metadata" JSONB;

ALTER TABLE "EventLog"
  ADD COLUMN "metadata" JSONB;

ALTER TABLE "Item"
  ADD COLUMN "subCategory" TEXT,
  ADD COLUMN "effectType" TEXT,
  ADD COLUMN "effectValue" DOUBLE PRECISION,
  ADD COLUMN "effectDurationSecs" INTEGER,
  ADD COLUMN "riskType" TEXT,
  ADD COLUMN "riskValue" DOUBLE PRECISION,
  ADD COLUMN "blackMarketOnly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consumable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stealable" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Inventory"
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "sourceType" TEXT;

CREATE TABLE "ProtectionEffect" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "sourceItemId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProtectionEffect_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BlackMarketRotation" (
  "id" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL,
  "theme" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlackMarketRotation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BlackMarketListing" (
  "id" TEXT NOT NULL,
  "rotationId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "basePrice" DOUBLE PRECISION NOT NULL,
  "finalPrice" DOUBLE PRECISION NOT NULL,
  "stock" INTEGER NOT NULL,
  "remainingStock" INTEGER NOT NULL,
  "riskPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "requiredHeatMin" INTEGER NOT NULL DEFAULT 0,
  "requiredLevelMin" INTEGER NOT NULL DEFAULT 1,
  "listingType" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlackMarketListing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BlackMarketPurchase" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "qty" INTEGER NOT NULL,
  "pricePaid" DOUBLE PRECISION NOT NULL,
  "heatGained" INTEGER NOT NULL DEFAULT 0,
  "stingTriggered" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlackMarketPurchase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MissionDefinition" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "goalType" TEXT NOT NULL,
  "goalValue" INTEGER NOT NULL,
  "rewardCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rewardRp" INTEGER NOT NULL DEFAULT 0,
  "rewardItemId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MissionDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerMission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "missionDefinitionId" TEXT NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "claimed" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlayerMission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MissionDefinition_code_key" ON "MissionDefinition"("code");
CREATE INDEX "ProtectionEffect_userId_type_idx" ON "ProtectionEffect"("userId", "type");
CREATE INDEX "ProtectionEffect_endsAt_idx" ON "ProtectionEffect"("endsAt");
CREATE INDEX "BlackMarketRotation_status_startsAt_endsAt_idx" ON "BlackMarketRotation"("status", "startsAt", "endsAt");
CREATE INDEX "BlackMarketListing_rotationId_active_idx" ON "BlackMarketListing"("rotationId", "active");
CREATE INDEX "BlackMarketListing_itemId_idx" ON "BlackMarketListing"("itemId");
CREATE INDEX "BlackMarketPurchase_userId_createdAt_idx" ON "BlackMarketPurchase"("userId", "createdAt");
CREATE INDEX "BlackMarketPurchase_listingId_idx" ON "BlackMarketPurchase"("listingId");
CREATE INDEX "MissionDefinition_type_active_idx" ON "MissionDefinition"("type", "active");
CREATE INDEX "PlayerMission_userId_completed_claimed_idx" ON "PlayerMission"("userId", "completed", "claimed");
CREATE INDEX "PlayerMission_userId_startsAt_endsAt_idx" ON "PlayerMission"("userId", "startsAt", "endsAt");

ALTER TABLE "ProtectionEffect"
  ADD CONSTRAINT "ProtectionEffect_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProtectionEffect"
  ADD CONSTRAINT "ProtectionEffect_sourceItemId_fkey" FOREIGN KEY ("sourceItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BlackMarketListing"
  ADD CONSTRAINT "BlackMarketListing_rotationId_fkey" FOREIGN KEY ("rotationId") REFERENCES "BlackMarketRotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BlackMarketListing"
  ADD CONSTRAINT "BlackMarketListing_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BlackMarketPurchase"
  ADD CONSTRAINT "BlackMarketPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BlackMarketPurchase"
  ADD CONSTRAINT "BlackMarketPurchase_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "BlackMarketListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BlackMarketPurchase"
  ADD CONSTRAINT "BlackMarketPurchase_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MissionDefinition"
  ADD CONSTRAINT "MissionDefinition_rewardItemId_fkey" FOREIGN KEY ("rewardItemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlayerMission"
  ADD CONSTRAINT "PlayerMission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerMission"
  ADD CONSTRAINT "PlayerMission_missionDefinitionId_fkey" FOREIGN KEY ("missionDefinitionId") REFERENCES "MissionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
