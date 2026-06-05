CREATE TYPE "CommunityGameStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "CommunityGame" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "creator" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[],
    "url" TEXT NOT NULL,
    "previewUrl" TEXT,
    "contact" TEXT,
    "status" "CommunityGameStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityGame_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunityGame_status_createdAt_idx" ON "CommunityGame"("status", "createdAt");
