import { NextResponse } from "next/server";
import { reservePokerAnteSchema } from "@/lib/pvpPokerSchema";
import { assertPartyKitRequest, verifyPrivyToken } from "@/lib/privyServer";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    assertPartyKitRequest(request);
    const payload = reservePokerAnteSchema.parse(await request.json());
    const privyId = await verifyPrivyToken(payload.privyToken);
    const externalId = `poker:${payload.matchId}:${privyId}`;

    const existing = await prisma.gameSession.findUnique({
      where: { externalId },
      include: { user: { include: { chipAccount: true } } }
    });

    if (existing) {
      return NextResponse.json({
        ok: true,
        alreadyReserved: true,
        balance: existing.user?.chipAccount?.balance ?? 0
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { privyId },
        create: {
          privyId,
          chipAccount: { create: {} }
        },
        update: {},
        include: { chipAccount: true }
      });

      if (!user.chipAccount || user.chipAccount.balance < payload.ante) {
        return { ok: false as const, balance: user.chipAccount?.balance ?? 0 };
      }

      const chipAccount = await tx.chipAccount.update({
        where: { userId: user.id },
        data: { balance: { decrement: payload.ante } }
      });

      await tx.gameSession.create({
        data: {
          externalId,
          userId: user.id,
          game: "POKER",
          outcome: "IN_PROGRESS",
          bet: payload.ante,
          metadata: {
            mode: "pvp",
            roomId: payload.roomId,
            matchId: payload.matchId,
            playerId: payload.playerId
          }
        }
      });

      return { ok: true as const, balance: chipAccount.balance };
    });

    if (!result.ok) {
      return NextResponse.json({ error: "Insufficient chips", balance: result.balance }, { status: 402 });
    }

    return NextResponse.json({ ok: true, balance: result.balance });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Poker ante reserve failed" }, { status: 400 });
  }
}
