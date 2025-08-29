import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  currency: z.string().length(3).default("USD"),
  imageUrl: z.string().url().optional(),
});

// POST /api/groups - Create group
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateGroupSchema.parse(body);

    const group = await prisma.$transaction(async (tx) => {
      // Create group
      const newGroup = await tx.group.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          currency: validatedData.currency,
          imageUrl: validatedData.imageUrl,
          createdBy: session.user.id,
        },
      });

      // Add creator as admin member
      await tx.groupMember.create({
        data: {
          groupId: newGroup.id,
          userId: session.user.id,
          role: "ADMIN",
        },
      });

      return newGroup;
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("Error creating group:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/groups - Get user's groups
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groups = await prisma.group.findMany({
      where: {
        isActive: true,
        members: {
          some: {
            userId: session.user.id,
            isActive: true,
          },
        },
      },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: {
            expenses: {
              where: { isDeleted: false },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
