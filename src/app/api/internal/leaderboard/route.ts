import { NextResponse } from "next/server";
import { recordLeaderboardResult } from "@/lib/leaderboard";
import { recordLeaderboardSchema } from "@/lib/leaderboardSchema";
import { assertPartyKitRequest, verifyPrivyToken } from "@/lib/privyServer";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    assertPartyKitRequest(request);
    const payload = recordLeaderboardSchema.safeParse(await request.json());

    if (!payload.success) {
      return NextResponse.json({ error: "Invalid leaderboard payload", issues: payload.error.flatten() }, { status: 400 });
    }

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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal leaderboard update failed" }, { status: 400 });
  }
}
