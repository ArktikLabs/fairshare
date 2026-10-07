import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { isSupportedCurrency, resolveCurrency } from "@/lib/currencies";
import { recordActivity } from "@/lib/activity";

const CreateGroupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional(),
  // Omitted -> the creator's preferred currency (fallback USD)
  currency: z
    .string()
    .length(3)
    .transform((c) => c.toUpperCase())
    .refine(isSupportedCurrency, "Unknown currency code")
    .optional(),
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
    const currency =
      validatedData.currency ??
      resolveCurrency(
        (await prisma.userPreferences.findUnique({ where: { userId: session.user.id }, select: { currency: true } }))
          ?.currency
      );

    const group = await prisma.$transaction(async (tx) => {
      // Create group
      const newGroup = await tx.group.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          currency,
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
          status: "ACTIVE",
          joinedAt: new Date(),
        },
      });
      await recordActivity({ type: "GROUP_CREATED", actorId: session.user.id, groupId: newGroup.id }, tx);

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
            status: { in: ["ACTIVE", "INVITED"] },
          },
        },
      },
      include: {
        members: {
          where: { status: { in: ["ACTIVE", "INVITED"] } },
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
            members: {
              where: { status: { in: ["ACTIVE", "INVITED"] } },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Add member status breakdown
    const groupsWithStats = groups.map(group => ({
      ...group,
      memberStatusCount: {
        active: group.members.filter(m => m.status === "ACTIVE").length,
        invited: group.members.filter(m => m.status === "INVITED").length,
      }
    }));

    return NextResponse.json(groupsWithStats);
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
