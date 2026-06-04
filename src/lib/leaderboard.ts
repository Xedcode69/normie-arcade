import type { GameOutcome, Prisma } from "@prisma/client";
import type { RecordLeaderboardInput } from "@/lib/leaderboardSchema";

type LeaderboardTx = Prisma.TransactionClient;

function outcomeCounts(outcome: GameOutcome | "WIN" | "LOSS" | "DRAW") {
  return {
    totalWins: outcome === "WIN" ? 1 : 0,
    totalLosses: outcome === "LOSS" ? 1 : 0,
    totalDraws: outcome === "DRAW" ? 1 : 0
  };
}

export async function recordLeaderboardResult(tx: LeaderboardTx, userId: string, input: RecordLeaderboardInput) {
  const counts = outcomeCounts(input.outcome);
  const metadata = (input.metadata ?? {}) as Prisma.InputJsonValue;

  await tx.leaderboardEntry.create({
    data: {
      userId,
      game: input.game,
      mode: input.mode,
      outcome: input.outcome,
      score: input.score,
      chipsWon: input.chipsWon,
      netChips: input.netChips,
      metadata
    }
  });

  const stat = await tx.leaderboardStat.upsert({
    where: {
      userId_game_mode: {
        userId,
        game: input.game,
        mode: input.mode
      }
    },
    create: {
      userId,
      game: input.game,
      mode: input.mode,
      netChips: input.netChips,
      totalWins: counts.totalWins,
      totalLosses: counts.totalLosses,
      totalDraws: counts.totalDraws,
      totalPlays: 1,
      bestScore: input.score,
      bestCombo: input.bestCombo,
      metadata
    },
    update: {
      netChips: { increment: input.netChips },
      totalWins: { increment: counts.totalWins },
      totalLosses: { increment: counts.totalLosses },
      totalDraws: { increment: counts.totalDraws },
      totalPlays: { increment: 1 },
      metadata
    }
  });

  if (input.score > stat.bestScore || input.bestCombo > stat.bestCombo) {
    await tx.leaderboardStat.update({
      where: { id: stat.id },
      data: {
        bestScore: Math.max(input.score, stat.bestScore),
        bestCombo: Math.max(input.bestCombo, stat.bestCombo)
      }
    });
  }
}
