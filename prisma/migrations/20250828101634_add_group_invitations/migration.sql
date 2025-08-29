-- CreateTable
CREATE TABLE "public"."GroupInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "role" "public"."GroupRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupInvitation_token_key" ON "public"."GroupInvitation"("token");

-- CreateIndex
CREATE INDEX "GroupInvitation_token_idx" ON "public"."GroupInvitation"("token");

-- CreateIndex
CREATE INDEX "GroupInvitation_email_idx" ON "public"."GroupInvitation"("email");

-- CreateIndex
CREATE INDEX "GroupInvitation_groupId_idx" ON "public"."GroupInvitation"("groupId");

-- CreateIndex
CREATE INDEX "GroupInvitation_expiresAt_idx" ON "public"."GroupInvitation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "GroupInvitation_email_groupId_key" ON "public"."GroupInvitation"("email", "groupId");

-- AddForeignKey
ALTER TABLE "public"."GroupInvitation" ADD CONSTRAINT "GroupInvitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupInvitation" ADD CONSTRAINT "GroupInvitation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
