import { NextResponse } from "next/server";
import { recordLeaderboardResult } from "@/lib/leaderboard";
import { settlePokerAnteSchema } from "@/lib/pvpPokerSchema";
import { assertPartyKitRequest, verifyPrivyToken } from "@/lib/privyServer";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    assertPartyKitRequest(request);
    const payload = settlePokerAnteSchema.parse(await request.json());
    const privyId = await verifyPrivyToken(payload.privyToken);
    const externalId = `poker:${payload.matchId}:${privyId}`;

    const session = await prisma.gameSession.findUnique({
      where: { externalId },
      include: { user: { include: { chipAccount: true } } }
    });

    if (!session?.user?.chipAccount) {
      return NextResponse.json({ error: "Reserved poker session not found" }, { status: 404 });
    }

    if (session.completedAt) {
      return NextResponse.json({ ok: true, alreadySettled: true, balance: session.user.chipAccount.balance });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const chipAccount =
          payload.payout > 0
            ? await tx.chipAccount.update({
                where: { userId: session.userId ?? "" },
                data: {
                  balance: { increment: payload.payout },
                  streak: payload.outcome === "WIN" ? { increment: 1 } : undefined,
                  multiplier: payload.outcome === "WIN" ? { increment: 0.1 } : undefined
                }
              })
            : await tx.chipAccount.update({
                where: { userId: session.userId ?? "" },
                data: {
                  streak: 0,
                  multiplier: 1
                }
              });

        await tx.gameSession.update({
          where: { id: session.id },
          data: {
            outcome: payload.outcome,
            payout: payload.payout,
            completedAt: new Date(),
            metadata: {
              mode: "pvp",
              roomId: payload.roomId,
              matchId: payload.matchId,
              playerId: payload.playerId,
              handName: payload.handName,
              score: payload.score
            }
          }
        });

        await recordLeaderboardResult(tx, session.userId ?? "", {
          privyToken: payload.privyToken,
          game: "POKER",
          mode: "PVP",
          outcome: payload.outcome,
          score: payload.outcome === "WIN" ? 1 : 0,
          chipsWon: payload.payout,
          netChips: payload.payout - session.bet,
          bestCombo: 0,
          metadata: {
            roomId: payload.roomId,
            matchId: payload.matchId,
            playerId: payload.playerId,
            handName: payload.handName,
            score: payload.score,
            reservedChips: session.bet
          }
        });

        return { balance: chipAccount.balance, payout: payload.payout };
      },
      { maxWait: 15_000, timeout: 30_000 }
    );

    return NextResponse.json({ ok: true, balance: result.balance, payout: result.payout });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Poker settle failed" }, { status: 400 });
  }
}
