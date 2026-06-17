-- CreateEnum
CREATE TYPE "VendaStatus" AS ENUM ('ABERTA', 'FINALIZADA', 'CANCELADA');
CREATE TYPE "VendaOrigem" AS ENUM ('PDV', 'ECOMMERCE', 'PDV_OFFLINE');
CREATE TYPE "VendaPaymentStatus" AS ENUM ('PENDENTE', 'PAGO', 'CANCELADO');

-- CreateTable vendas
CREATE SEQUENCE IF NOT EXISTS vendas_numero_seq;
CREATE TABLE "vendas" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL DEFAULT nextval('vendas_numero_seq'),
    "status" "VendaStatus" NOT NULL DEFAULT 'ABERTA',
    "origem" "VendaOrigem" NOT NULL DEFAULT 'PDV',
    "cliente_id" TEXT,
    "desconto_total_centavos" INTEGER NOT NULL DEFAULT 0,
    "total_bruto_centavos" INTEGER NOT NULL DEFAULT 0,
    "total_liquido_centavos" INTEGER NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "created_by" TEXT NOT NULL,
    "finalizada_em" TIMESTAMP(3),
    "cancelada_em" TIMESTAMP(3),
    "sync_id" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable venda_items
CREATE TABLE "venda_items" (
    "id" TEXT NOT NULL,
    "venda_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "numero_item" INTEGER NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "preco_unitario_centavos" INTEGER NOT NULL,
    "desconto_item_centavos" INTEGER NOT NULL DEFAULT 0,
    "total_centavos" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "venda_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable venda_payments
CREATE TABLE "venda_payments" (
    "id" TEXT NOT NULL,
    "venda_id" TEXT NOT NULL,
    "metodo" "PaymentMethod" NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "status" "VendaPaymentStatus" NOT NULL DEFAULT 'PENDENTE',
    "troco_centavos" INTEGER NOT NULL DEFAULT 0,
    "provider_transaction_id" VARCHAR(255),
    "pago_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "venda_payments_pkey" PRIMARY KEY ("id")
);

-- Unique indexes
CREATE UNIQUE INDEX "vendas_sync_id_key" ON "vendas"("sync_id");

-- Regular indexes
CREATE INDEX "vendas_unidade_id_status_idx" ON "vendas"("unidade_id", "status");
CREATE INDEX "vendas_unidade_id_created_at_idx" ON "vendas"("unidade_id", "created_at");
CREATE INDEX "vendas_cliente_id_idx" ON "vendas"("cliente_id");
CREATE INDEX "venda_items_venda_id_idx" ON "venda_items"("venda_id");
CREATE INDEX "venda_items_product_id_idx" ON "venda_items"("product_id");
CREATE INDEX "venda_payments_venda_id_idx" ON "venda_payments"("venda_id");

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "venda_items" ADD CONSTRAINT "venda_items_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "venda_items" ADD CONSTRAINT "venda_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "venda_payments" ADD CONSTRAINT "venda_payments_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
