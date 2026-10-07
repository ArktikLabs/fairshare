-- AlterTable
ALTER TABLE "public"."Expense" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "public"."ExpenseItem" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "public"."ExpenseItemSplit" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "public"."ExpensePayer" ALTER COLUMN "amountPaid" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "public"."ExpenseSplit" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "public"."Settlement" ADD COLUMN     "createdBy" TEXT,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- Data fix: accounts that signed up (password or OAuth account) were left as GHOST
-- because GHOST used to be the column default.
UPDATE "public"."User" SET "status" = 'ACTIVE'
WHERE "status" = 'GHOST'
  AND ("password" IS NOT NULL OR EXISTS (SELECT 1 FROM "public"."Account" a WHERE a."userId" = "User"."id"));
