import { NextResponse } from "next/server";
import { accountSyncSchema } from "@/lib/accountSchema";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const payload = accountSyncSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Invalid account payload", issues: payload.error.flatten() },
      { status: 400 }
    );
  }

  const { privyId, email, displayName, walletAddress } = payload.data;

  const user = await prisma.user.upsert({
    where: { privyId },
    create: {
      privyId,
      email: email ?? null,
      displayName: displayName ?? null,
      chipAccount: {
        create: {}
      }
    },
    update: {
      email: email ?? null,
      displayName: displayName ?? null
    },
    include: {
      chipAccount: true,
      wallets: true
    }
  });

  if (walletAddress) {
    await prisma.wallet.upsert({
      where: { address: walletAddress.toLowerCase() },
      create: {
        address: walletAddress.toLowerCase(),
        userId: user.id
      },
      update: {
        userId: user.id
      }
    });
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      chipAccount: true,
      wallets: true
    }
  });

  return NextResponse.json({ account });
}
