import { NextResponse } from "next/server";
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

    const result = await prisma.$transaction(async (tx) => {
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

      return { balance: chipAccount.balance, payout: payload.payout };
    });

    return NextResponse.json({ ok: true, balance: result.balance, payout: result.payout });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Poker settle failed" }, { status: 400 });
  }
}
