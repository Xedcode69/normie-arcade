import { NextResponse } from "next/server";
import { recordLeaderboardResult } from "@/lib/leaderboard";
import { getLeaderboardSchema, recordLeaderboardSchema } from "@/lib/leaderboardSchema";
import { verifyPrivyToken } from "@/lib/privyServer";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const payload = getLeaderboardSchema.safeParse({
    game: url.searchParams.get("game"),
    mode: url.searchParams.get("mode"),
    limit: url.searchParams.get("limit") ?? undefined
  });

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid leaderboard query", issues: payload.error.flatten() }, { status: 400 });
  }

  const orderBy =
    payload.data.mode === "SKILL"
      ? [{ bestScore: "desc" as const }, { bestCombo: "desc" as const }, { totalPlays: "asc" as const }]
      : [{ netChips: "desc" as const }, { totalWins: "desc" as const }, { totalPlays: "asc" as const }];

  const entries = await prisma.leaderboardStat.findMany({
    where: {
      game: payload.data.game,
      mode: payload.data.mode
    },
    orderBy,
    take: payload.data.limit,
    include: {
      user: {
        select: {
          username: true,
          displayName: true,
          selectedNormieId: true,
          ownedNormies: {
            select: { normieId: true, imageUrl: true }
          }
        }
      }
    }
  });

  return NextResponse.json({
    entries: entries.map((entry, index) => {
      const selectedNormie = entry.user.ownedNormies.find((normie) => normie.normieId === entry.user.selectedNormieId);
      return {
        rank: index + 1,
        player: entry.user.displayName || entry.user.username || "Normie Player",
        avatarUrl: selectedNormie?.imageUrl ?? null,
        game: entry.game,
        mode: entry.mode,
        netChips: entry.netChips,
        totalWins: entry.totalWins,
        totalLosses: entry.totalLosses,
        totalDraws: entry.totalDraws,
        totalPlays: entry.totalPlays,
        bestScore: entry.bestScore,
        bestCombo: entry.bestCombo,
        updatedAt: entry.updatedAt
      };
    })
  });
}

export async function POST(request: Request) {
  const payload = recordLeaderboardSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid leaderboard payload", issues: payload.error.flatten() }, { status: 400 });
  }

  try {
    const privyId = await verifyPrivyToken(payload.data.privyToken);

    await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.upsert({
          where: { privyId },
          create: {
            privyId,
            chipAccount: { create: {} }
          },
          update: {}
        });

        await recordLeaderboardResult(tx, user.id, payload.data);
      },
      { maxWait: 15_000, timeout: 30_000 }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Leaderboard update failed" }, { status: 400 });
  }
}
