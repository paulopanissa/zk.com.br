-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('ESTOQUE_BAIXO', 'MARGEM_BAIXA', 'VENDA_FINALIZADA', 'CUPOM_ESGOTADO');

-- CreateEnum
CREATE TYPE "AlertThresholdUnit" AS ENUM ('UNIDADES', 'BPS', 'NENHUM');

-- CreateTable alert_rules
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "threshold_value" INTEGER NOT NULL DEFAULT 0,
    "threshold_unit" "AlertThresholdUnit" NOT NULL DEFAULT 'NENHUM',
    "product_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable alert_events
CREATE TABLE "alert_events" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "context_id" VARCHAR(255),
    "context_type" VARCHAR(50),
    "message" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alert_rules_unidade_id_type_active_idx" ON "alert_rules"("unidade_id", "type", "active");

-- CreateIndex
CREATE INDEX "alert_events_unidade_id_type_created_at_idx" ON "alert_events"("unidade_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "alert_events_rule_id_idx" ON "alert_events"("rule_id");

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
