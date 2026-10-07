-- Batch 3: notifications outbox, WhatsApp phone verification, payment
-- reminders, recurring expenses, direct (1:1) groups, multi-currency expenses
-- and cached exchange rates. Additive only: new tables, nullable columns or
-- columns with defaults; new unique indexes are on new (all-NULL) columns.
-- Existing activity rows get notifiedAt = createdAt so the notifier never
-- back-sends old events.
-- CreateEnum
CREATE TYPE "public"."GroupKind" AS ENUM ('STANDARD', 'DIRECT');

-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."RecurrenceFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."RecurringStatus" AS ENUM ('ACTIVE', 'PAUSED', 'STOPPED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."ActivityType" ADD VALUE 'REMINDER_SENT';
ALTER TYPE "public"."ActivityType" ADD VALUE 'FRIEND_ADDED';

-- AlterTable
ALTER TABLE "public"."Activity" ADD COLUMN     "notifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Expense" ADD COLUMN     "exchangeRate" DECIMAL(24,10),
ADD COLUMN     "originalAmount" DECIMAL(14,2),
ADD COLUMN     "originalCurrency" TEXT,
ADD COLUMN     "rateDate" TIMESTAMP(3),
ADD COLUMN     "rateSource" TEXT,
ADD COLUMN     "recurrenceDate" TIMESTAMP(3),
ADD COLUMN     "recurringId" TEXT;

-- AlterTable
ALTER TABLE "public"."Group" ADD COLUMN     "autoRemindWeekly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "directKey" TEXT,
ADD COLUMN     "kind" "public"."GroupKind" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "lastAutoRemindAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."UserNotificationSetting" ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."UserPreferences" ADD COLUMN     "emailDigest" TEXT NOT NULL DEFAULT 'NEVER',
ADD COLUMN     "lastDigestAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityId" TEXT,
    "event" TEXT NOT NULL,
    "channel" "public"."NotificationChannel" NOT NULL,
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "dedupeKey" TEXT NOT NULL,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PhoneVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentReminder" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecurringExpense" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "frequency" "public"."RecurrenceFrequency" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "count" INTEGER NOT NULL DEFAULT 1,
    "nextDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."RecurringStatus" NOT NULL DEFAULT 'ACTIVE',
    "template" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "lastError" TEXT,
    "sourceExpenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExchangeRate" (
    "id" TEXT NOT NULL,
    "base" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "rate" DECIMAL(24,10) NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "public"."Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_status_nextAttemptAt_idx" ON "public"."Notification"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "public"."Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_activityId_idx" ON "public"."Notification"("activityId");

-- CreateIndex
CREATE INDEX "PhoneVerification_userId_createdAt_idx" ON "public"."PhoneVerification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PhoneVerification_phone_createdAt_idx" ON "public"."PhoneVerification"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentReminder_groupId_fromUserId_toUserId_createdAt_idx" ON "public"."PaymentReminder"("groupId", "fromUserId", "toUserId", "createdAt");

-- CreateIndex
CREATE INDEX "RecurringExpense_status_nextDate_idx" ON "public"."RecurringExpense"("status", "nextDate");

-- CreateIndex
CREATE INDEX "RecurringExpense_groupId_idx" ON "public"."RecurringExpense"("groupId");

-- CreateIndex
CREATE INDEX "ExchangeRate_base_quote_fetchedAt_idx" ON "public"."ExchangeRate"("base", "quote", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_base_quote_day_key" ON "public"."ExchangeRate"("base", "quote", "day");

-- CreateIndex
CREATE INDEX "Activity_notifiedAt_createdAt_idx" ON "public"."Activity"("notifiedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_recurringId_recurrenceDate_key" ON "public"."Expense"("recurringId", "recurrenceDate");

-- CreateIndex
CREATE UNIQUE INDEX "Group_directKey_key" ON "public"."Group"("directKey");

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "public"."RecurringExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "public"."Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhoneVerification" ADD CONSTRAINT "PhoneVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentReminder" ADD CONSTRAINT "PaymentReminder_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringExpense" ADD CONSTRAINT "RecurringExpense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringExpense" ADD CONSTRAINT "RecurringExpense_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecurringExpense" ADD CONSTRAINT "RecurringExpense_sourceExpenseId_fkey" FOREIGN KEY ("sourceExpenseId") REFERENCES "public"."Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Old events are history, not news
UPDATE "public"."Activity" SET "notifiedAt" = "createdAt" WHERE "notifiedAt" IS NULL;
