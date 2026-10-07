-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('EXPENSE_CREATED', 'EXPENSE_UPDATED', 'EXPENSE_DELETED', 'EXPENSE_RESTORED', 'PAYMENT_RECORDED', 'PAYMENT_UPDATED', 'PAYMENT_DELETED', 'PAYMENT_RESTORED', 'MEMBER_INVITED', 'MEMBER_JOINED', 'MEMBER_LEFT', 'MEMBER_REMOVED', 'MEMBER_ROLE_CHANGED', 'GROUP_CREATED', 'GROUP_RENAMED', 'GROUP_SETTINGS_CHANGED', 'GROUP_ARCHIVED', 'GROUP_UNARCHIVED', 'COMMENT_ADDED');

-- AlterTable
ALTER TABLE "public"."Expense" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "receiptKey" TEXT,
ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "public"."Group" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "simplifyDebts" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."Settlement" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "updatedById" TEXT;

-- CreateTable
CREATE TABLE "public"."Activity" (
    "id" TEXT NOT NULL,
    "groupId" TEXT,
    "actorId" TEXT NOT NULL,
    "type" "public"."ActivityType" NOT NULL,
    "expenseId" TEXT,
    "settlementId" TEXT,
    "commentId" TEXT,
    "targetUserId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExpenseComment" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_groupId_createdAt_idx" ON "public"."Activity"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_actorId_createdAt_idx" ON "public"."Activity"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_expenseId_idx" ON "public"."Activity"("expenseId");

-- CreateIndex
CREATE INDEX "Activity_settlementId_idx" ON "public"."Activity"("settlementId");

-- CreateIndex
CREATE INDEX "ExpenseComment_expenseId_createdAt_idx" ON "public"."ExpenseComment"("expenseId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseComment" ADD CONSTRAINT "ExpenseComment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseComment" ADD CONSTRAINT "ExpenseComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
