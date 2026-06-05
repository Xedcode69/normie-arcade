import { NextResponse } from "next/server";
import { communityGameReviewSchema } from "@/lib/communityGamesSchema";
import { prisma } from "@/lib/prisma";

function assertAdmin(request: Request) {
  const expected = process.env.COMMUNITY_GAMES_ADMIN_TOKEN;
  const received = request.headers.get("x-admin-token");

  if (!expected || received !== expected) {
    throw new Error("Unauthorized");
  }
}

export async function GET(request: Request) {
  try {
    assertAdmin(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "PENDING";

  const games = await prisma.communityGame.findMany({
    where: status === "ALL" ? undefined : { status: status === "APPROVED" || status === "REJECTED" ? status : "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ games });
}

export async function PATCH(request: Request) {
  try {
    assertAdmin(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = communityGameReviewSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid review payload", issues: payload.error.flatten() }, { status: 400 });
  }

  const game = await prisma.communityGame.update({
    where: { id: payload.data.id },
    data: { status: payload.data.status }
  });

  return NextResponse.json({ game });
}
