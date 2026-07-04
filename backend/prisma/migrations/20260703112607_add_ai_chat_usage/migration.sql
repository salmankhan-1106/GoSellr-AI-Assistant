-- CreateTable
CREATE TABLE "ai_chat_usage" (
    "id" UUID NOT NULL,
    "subject_key" TEXT NOT NULL,
    "usage_date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_chat_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_chat_usage_subject_key_usage_date_key" ON "ai_chat_usage"("subject_key", "usage_date");
