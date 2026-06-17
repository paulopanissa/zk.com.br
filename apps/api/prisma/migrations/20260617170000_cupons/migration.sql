-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('FIXO', 'PERCENTUAL', 'FRETE_GRATIS');

-- CreateTable coupons
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "type" "CouponType" NOT NULL,
    "value_centavos" INTEGER NOT NULL DEFAULT 0,
    "percent_bps" INTEGER NOT NULL DEFAULT 0,
    "product_id" TEXT,
    "description" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "max_uses" INTEGER,
    "uses_count" INTEGER NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable coupon_usages
CREATE TABLE "coupon_usages" (
    "id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "venda_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coupon_usages_pkey" PRIMARY KEY ("id")
);

-- Unique indexes
CREATE UNIQUE INDEX "coupons_unidade_id_code_key" ON "coupons"("unidade_id", "code");
CREATE UNIQUE INDEX "coupon_usages_coupon_id_venda_id_key" ON "coupon_usages"("coupon_id", "venda_id");

-- Regular indexes
CREATE INDEX "coupons_unidade_id_active_idx" ON "coupons"("unidade_id", "active");

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
