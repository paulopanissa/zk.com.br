-- CreateEnum
CREATE TYPE "AiContentType" AS ENUM ('DESCRIPTION', 'SHORT_DESCRIPTION', 'SEO', 'SCHEMA_ORG');

-- CreateEnum
CREATE TYPE "AiGenerationStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "ai_content_generations" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "types" "AiContentType"[],
    "status" "AiGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "generated" JSONB,
    "applied_at" TIMESTAMP(3),
    "error_message" TEXT,
    "job_id" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_content_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_content_generations_unidade_id_product_id_idx" ON "ai_content_generations"("unidade_id", "product_id");

-- CreateIndex
CREATE INDEX "ai_content_generations_unidade_id_status_idx" ON "ai_content_generations"("unidade_id", "status");

-- AddForeignKey
ALTER TABLE "ai_content_generations" ADD CONSTRAINT "ai_content_generations_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_content_generations" ADD CONSTRAINT "ai_content_generations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
