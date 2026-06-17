-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'DEEPSEEK', 'GOOGLE_GEMINI', 'ANTHROPIC');

-- CreateTable
CREATE TABLE "ai_api_keys" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "key_encrypted" TEXT NOT NULL,
    "key_prefix" VARCHAR(10) NOT NULL,
    "key_suffix" VARCHAR(10) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_tested_at" TIMESTAMP(3),
    "last_test_ok" BOOLEAN,
    "last_test_latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_api_keys_unidade_id_provider_label_key" ON "ai_api_keys"("unidade_id", "provider", "label");

-- CreateIndex
CREATE INDEX "ai_api_keys_unidade_id_provider_idx" ON "ai_api_keys"("unidade_id", "provider");

-- AddForeignKey
ALTER TABLE "ai_api_keys" ADD CONSTRAINT "ai_api_keys_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
