
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const SYSTEM_USER_EMAIL = "system@fair.share";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    prisma.user.findUnique({
      where: {
        email: SYSTEM_USER_EMAIL
      }
    })

    const expenseCategories = await prisma.expenseCategory.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { scope: "global" },
        ],
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { parent: { name: "asc" } },
        { name: "asc" },
      ],
    });

    return NextResponse.json({
      expenseCategories,
    });
  } catch (error) {
    console.error("Error fetching expense categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch expense categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const parentId = typeof body?.parentId === "string" && body.parentId.length > 0 ? body.parentId : null;
  const icon = typeof body?.icon === "string" && body.icon.trim().length > 0 ? body.icon.trim() : null;
  const color = typeof body?.color === "string" && body.color.trim().length > 0 ? body.color.trim() : null;
  const description = typeof body?.description === "string" && body.description.trim().length > 0 ? body.description.trim() : null;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (name.length > 60) {
    return NextResponse.json({ error: "Name must be 60 characters or fewer" }, { status: 400 });
  }

  if (description && description.length > 240) {
    return NextResponse.json({ error: "Description must be 240 characters or fewer" }, { status: 400 });
  }

  if (color && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
    return NextResponse.json({ error: "Color must be a valid hex value" }, { status: 400 });
  }

  try {
    if (parentId) {
      const parent = await prisma.expenseCategory.findFirst({
        where: {
          id: parentId,
          OR: [
            { ownerId: session.user.id },
            { scope: "global" },
          ],
        },
      });

      if (!parent) {
        return NextResponse.json({ error: "Parent category not found" }, { status: 404 });
      }
    }

    const category = await prisma.expenseCategory.create({
      data: {
        ownerId: session.user.id,
        name,
        parentId,
        icon,
        color,
        description,
        scope: "personal",
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "You already have a category with this name" },
          { status: 409 },
        );
      }
    }

    console.error("Failed to create expense category", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}
