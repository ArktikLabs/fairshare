import { prisma } from "./prisma";

const SYSTEM_USER_EMAIL = "system@fair.share";

export async function getGlobalExpenseCategories() {
  const systemUser = await prisma.user.findUnique({
    where: { email: SYSTEM_USER_EMAIL },
    select: { id: true },
  });

  if (!systemUser) return [];

  return prisma.expenseCategory.findMany({
    where: {
      ownerId: systemUser.id,
      scope: "global",
    },
    orderBy: { name: "asc" },
  });
}
