-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CNPJ', 'CPF');

-- CreateEnum
CREATE TYPE "RegimeTributario" AS ENUM ('SIMPLES', 'LUCRO_PRESUMIDO', 'LUCRO_REAL');

-- CreateEnum
CREATE TYPE "TipoEmailEmpresa" AS ENUM ('COMERCIAL', 'FINANCEIRO', 'SUPORTE', 'NFE', 'DPO', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoTelefoneEmpresa" AS ENUM ('COMERCIAL', 'FINANCEIRO', 'SUPORTE', 'WHATSAPP', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoEnderecoEmpresa" AS ENUM ('MATRIZ', 'CORRESPONDENCIA', 'COBRANCA');

-- CreateEnum
CREATE TYPE "TipoUnidade" AS ENUM ('MATRIZ', 'FILIAL', 'PONTO_DE_VENDA_MOVEL');

-- CreateEnum
CREATE TYPE "TipoDocumentoSupplier" AS ENUM ('CNPJ', 'CPF');

-- CreateEnum
CREATE TYPE "TipoCusto" AS ENUM ('FIXO', 'VARIAVEL');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE_ENTRY', 'PURCHASE_CANCEL', 'SALE_OUT', 'SALE_RETURN', 'MANUAL_ENTRY', 'MANUAL_EXIT', 'TRANSFER_OUT', 'TRANSFER_IN');

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL,
    "singleton_key" TEXT NOT NULL DEFAULT 'SINGLETON',
    "razao_social" VARCHAR(255) NOT NULL,
    "nome_fantasia" VARCHAR(255),
    "cnpj_cpf" VARCHAR(14) NOT NULL,
    "tipo_documento" "TipoDocumento" NOT NULL,
    "inscricao_estadual" VARCHAR(20),
    "inscricao_municipal" VARCHAR(20),
    "regime_tributario" "RegimeTributario" NOT NULL,
    "logo_url" VARCHAR(500),
    "site_url" VARCHAR(500),
    "dpo_email" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_emails" (
    "id" TEXT NOT NULL,
    "company_settings_id" TEXT NOT NULL,
    "tipo" "TipoEmailEmpresa" NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "company_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_phones" (
    "id" TEXT NOT NULL,
    "company_settings_id" TEXT NOT NULL,
    "tipo" "TipoTelefoneEmpresa" NOT NULL,
    "ddi" VARCHAR(5) NOT NULL DEFAULT '+55',
    "numero" VARCHAR(20) NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "company_phones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_addresses" (
    "id" TEXT NOT NULL,
    "company_settings_id" TEXT NOT NULL,
    "tipo" "TipoEnderecoEmpresa" NOT NULL,
    "logradouro" VARCHAR(255) NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "complemento" VARCHAR(100),
    "bairro" VARCHAR(100) NOT NULL,
    "municipio" VARCHAR(100) NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "cep" VARCHAR(8) NOT NULL,
    "codigo_ibge" VARCHAR(7),
    "principal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "company_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "company_settings_id" TEXT NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "tipo" "TipoUnidade" NOT NULL,
    "cnpj_inscricao" VARCHAR(20),
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "permite_venda_offline" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_addresses" (
    "id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "logradouro" VARCHAR(255) NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "complemento" VARCHAR(100),
    "bairro" VARCHAR(100) NOT NULL,
    "municipio" VARCHAR(100) NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "cep" VARCHAR(8) NOT NULL,
    "codigo_ibge" VARCHAR(7),

    CONSTRAINT "unit_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_configs" (
    "id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "estoque_proprio" BOOLEAN NOT NULL DEFAULT true,
    "caixa_proprio" BOOLEAN NOT NULL DEFAULT true,
    "gateway_pdv_override_id" TEXT,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'America/Sao_Paulo',

    CONSTRAINT "unit_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "logo_url" VARCHAR(512),
    "logo_storage_key" VARCHAR(512),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(512),
    "image_storage_key" VARCHAR(512),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "document" VARCHAR(14) NOT NULL,
    "document_type" "TipoDocumentoSupplier" NOT NULL,
    "razao_social" VARCHAR(200) NOT NULL,
    "nome_fantasia" VARCHAR(200),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "website" VARCHAR(512),
    "logo_url" VARCHAR(512),
    "logo_storage_key" VARCHAR(512),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_addresses" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "cep" VARCHAR(8) NOT NULL,
    "logradouro" VARCHAR(200) NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "complemento" VARCHAR(100),
    "bairro" VARCHAR(100) NOT NULL,
    "cidade" VARCHAR(100) NOT NULL,
    "estado" CHAR(2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_contacts" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "role" VARCHAR(100),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_brands" (
    "supplier_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,

    CONSTRAINT "supplier_brands_pkey" PRIMARY KEY ("supplier_id","brand_id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_items" (
    "id" TEXT NOT NULL,
    "cost_center_id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "tipo" "TipoCusto" NOT NULL,
    "valor_centavos" INTEGER,
    "percentual_bps" INTEGER,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "category_id" TEXT,
    "brand_id" TEXT,
    "name" VARCHAR(300) NOT NULL,
    "slug" VARCHAR(320) NOT NULL,
    "sku" VARCHAR(100),
    "barcode" VARCHAR(50),
    "description" TEXT,
    "short_description" VARCHAR(500),
    "unit" VARCHAR(10) NOT NULL DEFAULT 'UN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "min_stock" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_pricing" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "cost_price_cents" INTEGER NOT NULL DEFAULT 0,
    "sale_price_cents" INTEGER NOT NULL DEFAULT 0,
    "promotional_price_cents" INTEGER,
    "promotional_starts_at" TIMESTAMP(3),
    "promotional_ends_at" TIMESTAMP(3),
    "discount_enabled" BOOLEAN NOT NULL DEFAULT false,
    "max_discount_pct" DECIMAL(5,2),
    "margin_pct" DECIMAL(8,4),
    "margin_cents" INTEGER,

    CONSTRAINT "product_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_media" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "url" VARCHAR(512) NOT NULL,
    "media_type" "MediaType" NOT NULL,
    "alt_text" VARCHAR(255),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_delivery" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "weight_grams" INTEGER,
    "height_cm" DECIMAL(8,2),
    "width_cm" DECIMAL(8,2),
    "depth_cm" DECIMAL(8,2),
    "free_shipping" BOOLEAN NOT NULL DEFAULT false,
    "ships_from_store" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_fiscal" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "ncm" VARCHAR(8),
    "cfop" VARCHAR(5),
    "cest" VARCHAR(7),
    "origem" INTEGER,
    "cst_icms" VARCHAR(3),
    "csosn" VARCHAR(3),
    "cst_pis" VARCHAR(2),
    "cst_cofins" VARCHAR(2),
    "cst_ipi" VARCHAR(2),
    "aliquota_icms" DECIMAL(5,2),
    "aliquota_pis" DECIMAL(5,2),
    "aliquota_cofins" DECIMAL(5,2),
    "aliquota_ipi" DECIMAL(5,2),

    CONSTRAINT "product_fiscal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_seo" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "seo_title" VARCHAR(70),
    "seo_description" VARCHAR(160),
    "seo_keywords" TEXT[],
    "schema_org_json" JSONB,
    "schema_org_generated_at" TIMESTAMP(3),

    CONSTRAINT "product_seo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lots" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "invoice_item_id" TEXT,
    "code" VARCHAR(100) NOT NULL,
    "expires_at" DATE,
    "manufactured_at" DATE,
    "quantity_received" DECIMAL(12,3) NOT NULL,
    "tags" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "lot_id" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "reference_id" TEXT,
    "reference_type" VARCHAR(50),
    "idempotency_key" VARCHAR(255),
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_settings_singleton_key_key" ON "company_settings"("singleton_key");

-- CreateIndex
CREATE UNIQUE INDEX "company_settings_cnpj_cpf_key" ON "company_settings"("cnpj_cpf");

-- CreateIndex
CREATE UNIQUE INDEX "units_slug_key" ON "units"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "unit_addresses_unit_id_key" ON "unit_addresses"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "unit_configs_unit_id_key" ON "unit_configs"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_unidade_id_slug_key" ON "brands"("unidade_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_unidade_id_document_key" ON "suppliers"("unidade_id", "document");

-- CreateIndex
CREATE UNIQUE INDEX "products_unidade_id_slug_key" ON "products"("unidade_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_unidade_id_sku_key" ON "products"("unidade_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_unidade_id_barcode_key" ON "products"("unidade_id", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "product_pricing_product_id_key" ON "product_pricing"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_delivery_product_id_key" ON "product_delivery"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_fiscal_product_id_key" ON "product_fiscal"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_seo_product_id_key" ON "product_seo"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "lots_unidade_id_product_id_code_key" ON "lots"("unidade_id", "product_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_idempotency_key_key" ON "stock_movements"("idempotency_key");

-- CreateIndex
CREATE INDEX "stock_movements_unidade_id_product_id_lot_id_idx" ON "stock_movements"("unidade_id", "product_id", "lot_id");

-- CreateIndex
CREATE INDEX "stock_movements_unidade_id_product_id_idx" ON "stock_movements"("unidade_id", "product_id");

-- AddForeignKey
ALTER TABLE "company_emails" ADD CONSTRAINT "company_emails_company_settings_id_fkey" FOREIGN KEY ("company_settings_id") REFERENCES "company_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_phones" ADD CONSTRAINT "company_phones_company_settings_id_fkey" FOREIGN KEY ("company_settings_id") REFERENCES "company_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_addresses" ADD CONSTRAINT "company_addresses_company_settings_id_fkey" FOREIGN KEY ("company_settings_id") REFERENCES "company_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_company_settings_id_fkey" FOREIGN KEY ("company_settings_id") REFERENCES "company_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_addresses" ADD CONSTRAINT "unit_addresses_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_configs" ADD CONSTRAINT "unit_configs_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_addresses" ADD CONSTRAINT "supplier_addresses_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_brands" ADD CONSTRAINT "supplier_brands_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_brands" ADD CONSTRAINT "supplier_brands_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_items" ADD CONSTRAINT "cost_items_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_items" ADD CONSTRAINT "cost_items_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_pricing" ADD CONSTRAINT "product_pricing_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_delivery" ADD CONSTRAINT "product_delivery_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_fiscal" ADD CONSTRAINT "product_fiscal_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_seo" ADD CONSTRAINT "product_seo_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
