import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { normieImageUrl } from "@/lib/normieHolder";
import { verifyPrivyToken } from "@/lib/privyServer";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/)
    .nullable(),
  displayName: z.string().trim().min(1).max(40).nullable(),
  selectedNormieId: z.number().int().min(0).max(9999).nullable()
});

function profileResponse(user: {
  username: string | null;
  displayName: string | null;
  isNormieHolder: boolean;
  selectedNormieId: number | null;
  holderVerifiedAt: Date | null;
  ownedNormies: Array<{ normieId: number; imageUrl: string }>;
}) {
  const selected =
    user.selectedNormieId !== null
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

export async function PATCH(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

    if (!token) {
      return NextResponse.json({ error: "Missing Privy access token" }, { status: 401 });
    }

    const privyId = await verifyPrivyToken(token);
    const payload = profileSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({
      where: { privyId },
      include: { ownedNormies: true }
    });

    if (!existing) {
      return NextResponse.json({ error: "Account profile has not been synced yet" }, { status: 404 });
    }

    if (
      payload.selectedNormieId !== null &&
      !existing.ownedNormies.some((normie) => normie.normieId === payload.selectedNormieId)
    ) {
      return NextResponse.json({ error: "Selected avatar is not verified on this wallet" }, { status: 403 });
    }

    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        username: payload.username,
        displayName: payload.displayName,
        selectedNormieId: payload.selectedNormieId
      },
      include: {
        ownedNormies: {
          orderBy: { normieId: "asc" }
        }
      }
    });

    return NextResponse.json({ profile: profileResponse(user) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Profile update failed" }, { status: 400 });
  }
}
