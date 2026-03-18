-- DropForeignKey
ALTER TABLE "Battle" DROP CONSTRAINT "Battle_defenderId_fkey";

-- AlterTable
ALTER TABLE "Battle" ALTER COLUMN "defenderName" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Battle" ADD CONSTRAINT "Battle_defenderId_fkey" FOREIGN KEY ("defenderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
