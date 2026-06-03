import { NextResponse } from "next/server";
import { verifyPrivyToken } from "@/lib/privyServer";
import { prisma } from "@/lib/prisma";

const FAUCET_AMOUNT = 2500;

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === "production" && process.env.ENABLE_TEST_FAUCET !== "true") {
      return NextResponse.json({ error: "Test faucet is disabled" }, { status: 403 });
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const privyId = await verifyPrivyToken(token);

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

      const chipAccount = user.chipAccount
        ? await tx.chipAccount.update({
            where: { userId: user.id },
            data: {
              balance: { increment: FAUCET_AMOUNT },
              streak: 0,
              multiplier: 1
            }
          })
        : await tx.chipAccount.create({
            data: {
              userId: user.id,
              balance: FAUCET_AMOUNT,
              streak: 0,
              multiplier: 1
            }
          });

      return { chipAccount };
    });

    return NextResponse.json({
      ok: true,
      amount: FAUCET_AMOUNT,
      chipAccount: result.chipAccount
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Faucet failed" }, { status: 400 });
  }
}
