ALTER TYPE "GameKind" ADD VALUE IF NOT EXISTS 'SORT_SPRINT';

CREATE TYPE "LeaderboardMode" AS ENUM ('SOLO', 'PVP', 'SKILL');

ALTER TABLE "LeaderboardEntry"
  ADD COLUMN "mode" "LeaderboardMode" NOT NULL DEFAULT 'SOLO',
  ADD COLUMN "netChips" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "outcome" "GameOutcome";

CREATE TABLE "LeaderboardStat" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "game" "GameKind" NOT NULL,
  "mode" "LeaderboardMode" NOT NULL,
  "netChips" INTEGER NOT NULL DEFAULT 0,
  "totalWins" INTEGER NOT NULL DEFAULT 0,
  "totalLosses" INTEGER NOT NULL DEFAULT 0,
  "totalDraws" INTEGER NOT NULL DEFAULT 0,
  "totalPlays" INTEGER NOT NULL DEFAULT 0,
  "bestScore" INTEGER NOT NULL DEFAULT 0,
  "bestCombo" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LeaderboardStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeaderboardStat_userId_game_mode_key" ON "LeaderboardStat"("userId", "game", "mode");
CREATE INDEX "LeaderboardStat_game_mode_netChips_idx" ON "LeaderboardStat"("game", "mode", "netChips");
CREATE INDEX "LeaderboardStat_game_mode_bestScore_idx" ON "LeaderboardStat"("game", "mode", "bestScore");
CREATE INDEX "LeaderboardEntry_game_mode_score_idx" ON "LeaderboardEntry"("game", "mode", "score");
CREATE INDEX "LeaderboardEntry_game_mode_netChips_idx" ON "LeaderboardEntry"("game", "mode", "netChips");

ALTER TABLE "LeaderboardStat" ADD CONSTRAINT "LeaderboardStat_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
