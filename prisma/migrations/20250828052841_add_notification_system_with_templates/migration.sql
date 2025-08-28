/*
  Warnings:

  - You are about to drop the column `emailNotifications` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `expenseReminders` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `groupInvites` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyReport` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `settlementReminders` on the `UserPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `weeklyDigest` on the `UserPreferences` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."UserPreferences" DROP COLUMN "emailNotifications",
DROP COLUMN "expenseReminders",
DROP COLUMN "groupInvites",
DROP COLUMN "monthlyReport",
DROP COLUMN "settlementReminders",
DROP COLUMN "weeklyDigest";

-- CreateTable
CREATE TABLE "public"."NotificationTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "defaultEmail" BOOLEAN NOT NULL DEFAULT true,
    "defaultPush" BOOLEAN NOT NULL DEFAULT true,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserNotificationSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_key_key" ON "public"."NotificationTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationSetting_userId_templateKey_key" ON "public"."UserNotificationSetting"("userId", "templateKey");

-- AddForeignKey
ALTER TABLE "public"."UserNotificationSetting" ADD CONSTRAINT "UserNotificationSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
