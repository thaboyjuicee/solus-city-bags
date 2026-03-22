-- Add creatorId to Syndicate — records who originally created the syndicate.
-- Nullable so existing rows are unaffected; backfilled to leaderId for current records.
ALTER TABLE "Syndicate" ADD COLUMN "creatorId" TEXT;

-- Backfill: treat the current leader as the creator for all existing syndicates.
UPDATE "Syndicate" SET "creatorId" = "leaderId" WHERE "creatorId" IS NULL;
