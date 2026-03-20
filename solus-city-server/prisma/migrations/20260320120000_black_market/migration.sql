-- AlterTable: add $SLS economy fields to Profile
ALTER TABLE "Profile" ADD COLUMN "slsSpent" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Profile" ADD COLUMN "hospitalReleaseCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Profile" ADD COLUMN "hospitalReleaseDate" TIMESTAMP(3);

-- CreateTable: SLS transaction ledger
CREATE TABLE "SlsTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "usdValue" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlsTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SlsTransaction" ADD CONSTRAINT "SlsTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
