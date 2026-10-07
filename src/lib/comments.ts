import { prisma } from "./prisma";

export interface CommentRow {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
}

export async function listComments(expenseId: string): Promise<CommentRow[]> {
  const rows = await prisma.expenseComment.findMany({
    where: { expenseId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, displayName: true, email: true } } },
  });
  return rows.map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    author: { id: c.author.id, name: c.author.name || c.author.displayName || c.author.email },
  }));
}
