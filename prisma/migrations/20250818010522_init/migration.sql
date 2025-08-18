-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('SCHEDULED', 'CALLING', 'RETRYING', 'DONE', 'ESCALATED');

-- CreateTable
CREATE TABLE "public"."reminders" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "primary_phone" TEXT NOT NULL,
    "backup_phone" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "next_attempt_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "backup_attempts" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."Status" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_outcome" TEXT,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."call_logs" (
    "id" SERIAL NOT NULL,
    "reminder_id" INTEGER NOT NULL,
    "call_sid" TEXT,
    "outcome" TEXT,
    "transcript" TEXT,
    "intent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."call_logs" ADD CONSTRAINT "call_logs_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
