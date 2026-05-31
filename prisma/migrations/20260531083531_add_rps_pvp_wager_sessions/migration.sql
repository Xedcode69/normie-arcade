/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `GameSession` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "GameSession_externalId_key" ON "GameSession"("externalId");
