
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ExpenseFormPayload } from "@/types/expense";
import { revalidatePath } from "next/cache";

const { Decimal } = Prisma;

function parseJsonBody(body: unknown): ExpenseFormPayload | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const value = body as Record<string, unknown>;

  const description = typeof value.description === "string" ? value.description.trim() : "";
  const amount = typeof value.amount === "string" ? value.amount.trim() : "";
  const currency = typeof value.currency === "string" ? value.currency.trim().toUpperCase() : "";
  const occurredAt = typeof value.occurredAt === "string" ? value.occurredAt : "";
  const dueAt = typeof value.dueAt === "string" ? value.dueAt : null;
  const splitMethod = value.splitMethod === "exact" ? "exact" : "equal";
  const categoryId = typeof value.categoryId === "string" && value.categoryId.length > 0 ? value.categoryId : null;
  const notes = typeof value.notes === "string" ? value.notes.trim() : undefined;
  const paidByUserId = typeof value.paidByUserId === "string" ? value.paidByUserId : "";
  const attachments = Array.isArray(value.attachments) ? value.attachments : undefined;

  const participantsRaw = Array.isArray(value.participants) ? value.participants : [];
  const participants = participantsRaw
    .map((participant) => {
      if (!participant || typeof participant !== "object") {
        return null;
      }
      const data = participant as Record<string, unknown>;
      const userId = typeof data.userId === "string" ? data.userId : "";
      const shareAmount = typeof data.shareAmount === "string" ? data.shareAmount : undefined;
      return userId
        ? {
            userId,
            shareAmount,
          }
        : null;
    })
    .filter((participant): participant is { userId: string; shareAmount?: string } => participant !== null);

  return {
    description,
    amount,
    currency,
    occurredAt,
    dueAt,
    splitMethod,
    categoryId,
    notes,
    paidByUserId,
    participants,
    attachments,
  };
}

function parseCents(value: string): number | null {
  try {
    const decimal = new Decimal(value);
    const cents = decimal.mul(100);
    if (!cents.isInt()) {
      return null;
    }
    return cents.toNumber();
  } catch {
    return null;
  }
}

function isValidIsoDate(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}


export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  let limit = Number.parseInt(limitParam ?? "", 10);
  if (!Number.isFinite(limit) || limit <= 0) {
    limit = 5;
  }
  limit = Math.min(limit, 20);

  try {
    const expenses = await prisma.expense.findMany({
      where: {
        participants: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        ExpenseCategory: {
          select: {
            id: true,
            name: true,
          },
        },
        paidByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        occurredAt: "desc",
      },
      take: limit,
    });

    const serialized = expenses.map((expense) => ({
      id: expense.id,
      description: expense.description,
      amount: expense.amount.toString(),
      currency: expense.currency,
      occurredAt: expense.occurredAt.toISOString(),
      status: expense.status,
      category: expense.ExpenseCategory
        ? {
            id: expense.ExpenseCategory.id,
            name: expense.ExpenseCategory.name,
          }
        : null,
      paidBy: expense.paidByUser
        ? {
            id: expense.paidByUser.id,
            name: expense.paidByUser.name,
            email: expense.paidByUser.email,
          }
        : null,
      participants: expense.participants.map((participant) => ({
        id: participant.id,
        userId: participant.userId,
        name: participant.user?.name ?? null,
        email: participant.user?.email ?? null,
        shareAmount: participant.shareAmount ? participant.shareAmount.toString() : null,
      })),
    }));

    return NextResponse.json({ expenses: serialized });
  } catch (error) {
    console.error("Error fetching recent expenses", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: ExpenseFormPayload | null = null;

  try {
    const json = await request.json();
    payload = parseJsonBody(json);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!payload.description || payload.description.length < 3) {
    return NextResponse.json({ error: "Description must be at least 3 characters" }, { status: 400 });
  }

  const amountCents = parseCents(payload.amount);
  if (amountCents === null || amountCents <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number with at most two decimals" }, { status: 400 });
  }

  if (!/^[A-Z]{3}$/.test(payload.currency)) {
    return NextResponse.json({ error: "Currency must be a valid ISO code" }, { status: 400 });
  }

  if (!payload.occurredAt || !isValidIsoDate(payload.occurredAt)) {
    return NextResponse.json({ error: "Occurred date is invalid" }, { status: 400 });
  }

  if (payload.dueAt && !isValidIsoDate(payload.dueAt)) {
    return NextResponse.json({ error: "Due date is invalid" }, { status: 400 });
  }

  if (!payload.paidByUserId) {
    return NextResponse.json({ error: "Paid by user is required" }, { status: 400 });
  }

  if (!Array.isArray(payload.participants) || payload.participants.length === 0) {
    return NextResponse.json({ error: "At least one participant is required" }, { status: 400 });
  }

  const participantIds = payload.participants.map((participant) => participant.userId);
  const uniqueParticipantIds = new Set(participantIds);

  if (participantIds.length !== uniqueParticipantIds.size) {
    return NextResponse.json({ error: "Duplicate participants are not allowed" }, { status: 400 });
  }

  if (!uniqueParticipantIds.has(payload.paidByUserId)) {
    return NextResponse.json({ error: "The payer must be one of the participants" }, { status: 400 });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: Array.from(uniqueParticipantIds),
        },
      },
      select: { id: true },
    });

    if (users.length !== uniqueParticipantIds.size) {
      return NextResponse.json({ error: "One or more participants do not exist" }, { status: 400 });
    }

    const amountDecimal = new Decimal(amountCents).div(100);
    const participantCount = payload.participants.length;
    const shareDecimals: Prisma.Decimal[] = [];

    if (payload.splitMethod === "equal") {
      const baseShare = Math.floor(amountCents / participantCount);
      const remainder = amountCents - baseShare * participantCount;

      payload.participants.forEach((participant, index) => {
        const cents = baseShare + (index < remainder ? 1 : 0);
        shareDecimals.push(new Decimal(cents).div(100));
      });
    } else {
      let totalShareCents = 0;

      for (const participant of payload.participants) {
        if (!participant.shareAmount) {
          return NextResponse.json({ error: "All participants need a share amount" }, { status: 400 });
        }

        const shareCents = parseCents(participant.shareAmount);
        if (shareCents === null || shareCents < 0) {
          return NextResponse.json({ error: "Share amounts must be non-negative numbers with at most two decimals" }, { status: 400 });
        }

        totalShareCents += shareCents;
        shareDecimals.push(new Decimal(shareCents).div(100));
      }

      if (totalShareCents !== amountCents) {
        return NextResponse.json({ error: "Participant shares must add up to the total amount" }, { status: 400 });
      }
    }

    const occurredAt = new Date(payload.occurredAt);
    const dueAt = payload.dueAt ? new Date(payload.dueAt) : null;

    if (dueAt && dueAt < occurredAt) {
      return NextResponse.json({ error: "Due date cannot be before the occurred date" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        description: payload.description,
        notes: payload.notes ?? null,
        amount: amountDecimal,
        currency: payload.currency,
        occurredAt,
        dueAt,
        splitMethod: payload.splitMethod,
        status: "active",
        expenseCategoryId: payload.categoryId ?? null,
        paidByUserId: payload.paidByUserId,
        createdByUserId: session.user.id,
        participants: {
          create: payload.participants.map((participant, index) => ({
            userId: participant.userId,
            shareAmount: shareDecimals[index],
          })),
        },
      },
      select: {
        id: true,
      },
    });

    revalidatePath("/dashboard");

    return NextResponse.json({ id: expense.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create expense", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
