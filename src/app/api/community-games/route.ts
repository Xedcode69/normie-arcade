import { NextResponse } from "next/server";
import { communityGameSubmitSchema } from "@/lib/communityGamesSchema";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const games = await prisma.communityGame.findMany({
    where: { status: "APPROVED" },
    orderBy: { updatedAt: "desc" },
    take: 24,
    select: {
      id: true,
      name: true,
      creator: true,
      description: true,
      tags: true,
      url: true,
      previewUrl: true
    }
  });

  return NextResponse.json({ games });
}

export async function POST(request: Request) {
  const payload = communityGameSubmitSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid community game submission", issues: payload.error.flatten() }, { status: 400 });
  }

  const game = await prisma.communityGame.create({
    data: {
      ...payload.data,
      previewUrl: payload.data.previewUrl || null,
      contact: payload.data.contact || null,
      status: "PENDING"
    },
    select: { id: true, status: true }
  });

  return NextResponse.json({ game }, { status: 201 });
}
