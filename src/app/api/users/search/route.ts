
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_RESULTS = 10;

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await prisma.user.findMany({
      where: {
        id: { not: session.user.id },
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: [
        { name: "asc" },
        { email: "asc" },
      ],
      take: MAX_RESULTS,
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Failed to search users", error);
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
  }
}
