import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchHolderNormieIds, isHolderVerificationFresh, normieImageUrl } from "@/lib/normieHolder";
import { verifyPrivyToken } from "@/lib/privyServer";
import { prisma } from "@/lib/prisma";

const verifyNormiesSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  selectedNormieId: z.number().int().min(0).max(9999).optional().nullable(),
  force: z.boolean().optional()
});

function profileResponse(user: {
  username: string | null;
  displayName: string | null;
  isNormieHolder: boolean;
  selectedNormieId: number | null;
  holderVerifiedAt: Date | null;
  ownedNormies: Array<{ normieId: number; imageUrl: string }>;
}) {
  const selected = user.selectedNormieId !== null
    ? user.ownedNormies.find((normie) => normie.normieId === user.selectedNormieId)
    : undefined;

  return {
    username: user.username,
    displayName: user.displayName,
    isNormieHolder: user.isNormieHolder,
    selectedNormieId: user.selectedNormieId,
    selectedNormieImage: selected?.imageUrl ?? (user.selectedNormieId !== null ? normieImageUrl(user.selectedNormieId) : null),
    holderVerifiedAt: user.holderVerifiedAt,
    ownedNormieIds: user.ownedNormies.map((normie) => normie.normieId)
  };
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

    if (!token) {
      return NextResponse.json({ error: "Missing Privy access token" }, { status: 401 });
    }

    const privyId = await verifyPrivyToken(token);
    const payload = verifyNormiesSchema.parse(await request.json());
    const walletAddress = payload.walletAddress.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { privyId },
      include: { wallets: true, ownedNormies: true }
    });

    if (!existing) {
      return NextResponse.json({ error: "Account profile has not been synced yet" }, { status: 404 });
    }

    const walletBelongsToUser = existing.wallets.some((wallet) => wallet.address.toLowerCase() === walletAddress);
    if (!walletBelongsToUser) {
      return NextResponse.json({ error: "Wallet is not linked to this account" }, { status: 403 });
    }

    if (!payload.force && existing.holderWalletAddress === walletAddress && isHolderVerificationFresh(existing.holderVerifiedAt)) {
      return NextResponse.json({ profile: profileResponse(existing) });
    }

    const ownedIds = await fetchHolderNormieIds(walletAddress);
    const selectedStillOwned = payload.selectedNormieId !== null && payload.selectedNormieId !== undefined && ownedIds.includes(payload.selectedNormieId);
    const selectedNormieId = selectedStillOwned ? payload.selectedNormieId! : ownedIds[0] ?? null;

    const user = await prisma.$transaction(async (tx) => {
      await tx.userNormie.deleteMany({ where: { userId: existing.id } });

      if (ownedIds.length) {
        await tx.userNormie.createMany({
          data: ownedIds.map((normieId) => ({
            userId: existing.id,
            normieId,
            imageUrl: normieImageUrl(normieId)
          })),
          skipDuplicates: true
        });
      }

      return tx.user.update({
        where: { id: existing.id },
        data: {
          isNormieHolder: ownedIds.length > 0,
          selectedNormieId,
          holderVerifiedAt: new Date(),
          holderWalletAddress: walletAddress
        },
        include: {
          ownedNormies: {
            orderBy: { normieId: "asc" }
          }
        }
      });
    });

    return NextResponse.json({ profile: profileResponse(user) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Normie verification failed" }, { status: 400 });
  }
}
