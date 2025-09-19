-- CreateIndex
CREATE INDEX "Friend_receiverId_status_idx" ON "public"."Friend"("receiverId", "status");

-- CreateIndex
CREATE INDEX "Friend_senderId_status_idx" ON "public"."Friend"("senderId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_status_createdAt_idx" ON "public"."Notification"("userId", "status", "createdAt");
