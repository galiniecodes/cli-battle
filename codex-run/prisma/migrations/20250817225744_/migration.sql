-- CreateEnum
CREATE TYPE "Status" AS ENUM ('SCHEDULED', 'CALLING', 'RETRYING', 'DONE', 'ESCALATED');

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "primary_phone" TEXT NOT NULL,
    "backup_phone" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "next_attempt_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "backup_attempts" INTEGER NOT NULL DEFAULT 0,
    "status" "Status" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_outcome" TEXT,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "reminder_id" TEXT NOT NULL,
    "call_sid" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "transcript" TEXT,
    "intent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_reminder_created_at" ON "Reminder"("created_at");

-- CreateIndex
CREATE INDEX "idx_calllog_reminder_id" ON "CallLog"("reminder_id");

-- CreateIndex
CREATE INDEX "idx_calllog_created_at" ON "CallLog"("created_at");

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "Reminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
