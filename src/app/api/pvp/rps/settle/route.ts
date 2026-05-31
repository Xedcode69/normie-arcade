import { NextResponse } from "next/server";
import { settleRpsWagerSchema } from "@/lib/pvpRpsSchema";
import { assertPartyKitRequest, verifyPrivyToken } from "@/lib/privyServer";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    assertPartyKitRequest(request);
    const payload = settleRpsWagerSchema.parse(await request.json());
    const privyId = await verifyPrivyToken(payload.privyToken);
    const externalId = `rps:${payload.matchId}:${privyId}`;

    const session = await prisma.gameSession.findUnique({
      where: { externalId },
      include: { user: { include: { chipAccount: true } } }
    });

    if (!session?.user?.chipAccount) {
      return NextResponse.json({ error: "Reserved match session not found" }, { status: 404 });
    }

    if (session.completedAt) {
      return NextResponse.json({ ok: true, alreadySettled: true, balance: session.user.chipAccount.balance });
    }

    const payout = payload.outcome === "WIN" ? payload.bet * 2 : 0;

    const result = await prisma.$transaction(async (tx) => {
      const chipAccount =
        payout > 0
          ? await tx.chipAccount.update({
              where: { userId: session.userId ?? "" },
              data: {
                balance: { increment: payout },
                streak: { increment: 1 },
                multiplier: { increment: 0.1 }
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
          payout,
          completedAt: new Date(),
          metadata: {
            mode: "pvp",
            roomId: payload.roomId,
            matchId: payload.matchId,
            playerId: payload.playerId,
            score: payload.score
          }
        }
      });

      return { balance: chipAccount.balance, payout };
    });

    return NextResponse.json({ ok: true, balance: result.balance, payout: result.payout });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Settle failed" }, { status: 400 });
  }
}
