-- AlterTable
ALTER TABLE "User" ADD COLUMN     "holderVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "holderWalletAddress" TEXT,
ADD COLUMN     "isNormieHolder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "selectedNormieId" INTEGER;

-- CreateTable
CREATE TABLE "UserNormie" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "normieId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNormie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserNormie_userId_idx" ON "UserNormie"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserNormie_userId_normieId_key" ON "UserNormie"("userId", "normieId");

-- AddForeignKey
ALTER TABLE "UserNormie" ADD CONSTRAINT "UserNormie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
