import { NextResponse } from "next/server";
import { reservePokerWagerSchema } from "@/lib/pvpPokerSchema";
import { assertPartyKitRequest, verifyPrivyToken } from "@/lib/privyServer";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    assertPartyKitRequest(request);
    const payload = reservePokerWagerSchema.parse(await request.json());
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
      return NextResponse.json({ error: "Poker session is already settled" }, { status: 409 });
    }

    if (session.user.chipAccount.balance < payload.amount) {
      return NextResponse.json({ error: "Insufficient chips", balance: session.user.chipAccount.balance }, { status: 402 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const chipAccount = await tx.chipAccount.update({
        where: { userId: session.userId ?? "" },
        data: { balance: { decrement: payload.amount } }
      });

      await tx.gameSession.update({
        where: { id: session.id },
        data: {
          bet: { increment: payload.amount },
          metadata: {
            mode: "pvp",
            roomId: payload.roomId,
            matchId: payload.matchId,
            playerId: payload.playerId,
            addedWager: true
          }
        }
      });

      return { balance: chipAccount.balance };
    });

    return NextResponse.json({ ok: true, balance: result.balance });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Poker wager failed" }, { status: 400 });
  }
}
