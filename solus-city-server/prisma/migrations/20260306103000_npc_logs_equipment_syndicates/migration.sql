-- Item model extensions
ALTER TABLE "Item" RENAME COLUMN "type" TO "category";
ALTER TABLE "Item"
  ADD COLUMN "speed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "dex" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "levelRequirement" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "rarity" TEXT,
  ADD COLUMN "description" TEXT DEFAULT '',
  ADD COLUMN "stackable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isUnique" BOOLEAN NOT NULL DEFAULT false;

-- Battle model extensions
ALTER TABLE "Battle" DROP CONSTRAINT "Battle_defenderId_fkey";
ALTER TABLE "Battle"
  ALTER COLUMN "defenderId" DROP NOT NULL,
  ADD COLUMN "defenderType" TEXT NOT NULL DEFAULT 'player',
  ADD COLUMN "defenderNpcId" TEXT,
  ADD COLUMN "defenderName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "xpGained" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "damageDealt" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "damageTaken" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "hospitalizedTarget" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hospitalizedSelf" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_defenderId_fkey" FOREIGN KEY ("defenderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Profile default alignment
ALTER TABLE "Profile" ALTER COLUMN "hospitalUntil" SET DEFAULT '1970-01-01T00:00:00Z';

-- Attack logs
CREATE TABLE "AttackLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "type" TEXT NOT NULL,
  "attackerId" TEXT,
  "defenderId" TEXT,
  "attackerName" TEXT NOT NULL,
  "defenderName" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "damageDealt" INTEGER NOT NULL,
  "damageTaken" INTEGER NOT NULL,
  "loot" DOUBLE PRECISION NOT NULL,
  "rpChange" INTEGER NOT NULL,
  "xpGained" INTEGER NOT NULL,
  "hospitalResult" TEXT NOT NULL DEFAULT 'none',
  "revengeTargetId" TEXT,
  "revengeAvailable" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "AttackLog_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AttackLog" ADD CONSTRAINT "AttackLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Syndicates
CREATE TABLE "Syndicate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "buffType" TEXT NOT NULL DEFAULT 'ap',
  "buffValue" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
  "leaderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Syndicate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Syndicate_name_key" ON "Syndicate"("name");
CREATE UNIQUE INDEX "Syndicate_leaderId_key" ON "Syndicate"("leaderId");
ALTER TABLE "Syndicate" ADD CONSTRAINT "Syndicate_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SyndicateMember" (
  "id" TEXT NOT NULL,
  "syndicateId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyndicateMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SyndicateMember_userId_key" ON "SyndicateMember"("userId");
CREATE UNIQUE INDEX "SyndicateMember_syndicateId_userId_key" ON "SyndicateMember"("syndicateId", "userId");
ALTER TABLE "SyndicateMember" ADD CONSTRAINT "SyndicateMember_syndicateId_fkey" FOREIGN KEY ("syndicateId") REFERENCES "Syndicate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SyndicateMember" ADD CONSTRAINT "SyndicateMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
