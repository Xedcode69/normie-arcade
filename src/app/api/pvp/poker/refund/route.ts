import { NextResponse } from "next/server";
import { refundPokerAnteSchema } from "@/lib/pvpPokerSchema";
import { assertPartyKitRequest, verifyPrivyToken } from "@/lib/privyServer";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    assertPartyKitRequest(request);
    const payload = refundPokerAnteSchema.parse(await request.json());
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
      const chipAccount = await tx.chipAccount.update({
        where: { userId: session.userId ?? "" },
        data: { balance: { increment: session.bet } }
      });

      await tx.gameSession.update({
        where: { id: session.id },
        data: {
          outcome: "DRAW",
          payout: session.bet,
          completedAt: new Date(),
          metadata: {
            mode: "pvp",
            roomId: payload.roomId,
            matchId: payload.matchId,
            playerId: payload.playerId,
            refund: true
          }
        }
      });

      return { balance: chipAccount.balance };
    });

    return NextResponse.json({ ok: true, balance: result.balance });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Poker refund failed" }, { status: 400 });
  }
}
