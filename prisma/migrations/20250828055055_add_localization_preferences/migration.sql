-- AlterTable
ALTER TABLE "public"."UserPreferences" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';
