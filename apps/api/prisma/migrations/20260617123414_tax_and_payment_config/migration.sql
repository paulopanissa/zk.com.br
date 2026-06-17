-- CreateEnum
CREATE TYPE "TipoImposto" AS ENUM ('ISS', 'ICMS', 'IPI', 'PIS', 'COFINS', 'DIFAL', 'FCP');

-- CreateEnum
CREATE TYPE "BaseCalculo" AS ENUM ('PRECO_VENDA', 'PRECO_COMPRA', 'VALOR_AGREGADO');

-- CreateEnum
CREATE TYPE "TipoImpostoNcm" AS ENUM ('IPI', 'PIS', 'COFINS', 'ICMS');

-- CreateEnum
CREATE TYPE "PaymentProviderSlug" AS ENUM ('ASAAS', 'MERCADO_PAGO', 'STRIPE', 'PAGSEGURO', 'PAYPAL');

-- CreateEnum
CREATE TYPE "PaymentEnvironment" AS ENUM ('SANDBOX', 'PRODUCAO');

-- CreateEnum
CREATE TYPE "PaymentChannel" AS ENUM ('PDV', 'ECOMMERCE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'BOLETO', 'DINHEIRO', 'MAQUININHA_POINT');

-- CreateTable
CREATE TABLE "tax_profiles" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "regime_tributario" "RegimeTributario" NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "imposto" "TipoImposto" NOT NULL,
    "aliquota_percentual" INTEGER NOT NULL,
    "base_calculo" "BaseCalculo" NOT NULL,
    "incluso_no_preco" BOOLEAN NOT NULL DEFAULT false,
    "uf_origem" CHAR(2),
    "uf_destino" CHAR(2),

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ncm_tax_overrides" (
    "id" TEXT NOT NULL,
    "ncm" VARCHAR(8) NOT NULL,
    "imposto" "TipoImpostoNcm" NOT NULL,
    "aliquota_percentual" INTEGER NOT NULL,
    "descricao" VARCHAR(255),

    CONSTRAINT "ncm_tax_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_providers" (
    "id" TEXT NOT NULL,
    "slug" "PaymentProviderSlug" NOT NULL,
    "nome_exibicao" VARCHAR(100) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "webhook_secret" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_provider_credentials" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "chave" VARCHAR(100) NOT NULL,
    "valor" TEXT NOT NULL,
    "ambiente" "PaymentEnvironment" NOT NULL,

    CONSTRAINT "payment_provider_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_channel_configs" (
    "id" TEXT NOT NULL,
    "canal" "PaymentChannel" NOT NULL,
    "provider_id" TEXT NOT NULL,
    "ambiente" "PaymentEnvironment" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_channel_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_method_mappings" (
    "id" TEXT NOT NULL,
    "canal" "PaymentChannel" NOT NULL,
    "metodo" "PaymentMethod" NOT NULL,
    "provider_id" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "taxa_percentual" INTEGER NOT NULL DEFAULT 0,
    "taxa_fixa_centavos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "payment_method_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProviderSlug" NOT NULL,
    "event_id" VARCHAR(255) NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ncm_tax_overrides_ncm_imposto_key" ON "ncm_tax_overrides"("ncm", "imposto");

-- CreateIndex
CREATE UNIQUE INDEX "payment_providers_slug_key" ON "payment_providers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "payment_provider_credentials_provider_id_chave_ambiente_key" ON "payment_provider_credentials"("provider_id", "chave", "ambiente");

-- CreateIndex
CREATE UNIQUE INDEX "payment_channel_configs_canal_key" ON "payment_channel_configs"("canal");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_mappings_canal_metodo_key" ON "payment_method_mappings"("canal", "metodo");

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhook_events_provider_event_id_key" ON "payment_webhook_events"("provider", "event_id");

-- AddForeignKey
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "tax_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_provider_credentials" ADD CONSTRAINT "payment_provider_credentials_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "payment_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_channel_configs" ADD CONSTRAINT "payment_channel_configs_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "payment_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_method_mappings" ADD CONSTRAINT "payment_method_mappings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "payment_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
