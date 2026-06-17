-- Enable pg_trgm for fuzzy name search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "CustomerFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTISELECT', 'BOOLEAN', 'PHONE', 'EMAIL', 'CPF_CNPJ');

-- CreateEnum
CREATE TYPE "CustomerAuditAction" AS ENUM ('CRIACAO', 'LEITURA', 'ATUALIZACAO', 'EXCLUSAO', 'EXPORTACAO');

-- CreateTable
CREATE TABLE "customer_field_definitions" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "nome_campo" VARCHAR(60) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "tipo" "CustomerFieldType" NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "validacao_regex" VARCHAR(500),
    "opcoes" JSONB,
    "ordem" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "telefone_principal" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "cpf_cnpj_enc" TEXT,
    "cpf_cnpj_hash" VARCHAR(64),
    "data_nascimento_enc" TEXT,
    "dados_dinamicos" JSONB,
    "consentimento_lgpd" BOOLEAN NOT NULL DEFAULT false,
    "consentimento_versao" VARCHAR(20),
    "consentimento_em" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_audit_logs" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "acao" "CustomerAuditAction" NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "ip_origem" VARCHAR(45),
    "detalhe" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_field_definitions_unidade_id_nome_campo_key" ON "customer_field_definitions"("unidade_id", "nome_campo");

-- CreateIndex
CREATE UNIQUE INDEX "customer_field_definitions_unidade_id_ordem_key" ON "customer_field_definitions"("unidade_id", "ordem");

-- CreateIndex
CREATE INDEX "customers_unidade_id_idx" ON "customers"("unidade_id");

-- CreateIndex
CREATE INDEX "customers_cpf_cnpj_hash_idx" ON "customers"("cpf_cnpj_hash");

-- CreateIndex
CREATE INDEX "customer_audit_logs_customer_id_idx" ON "customer_audit_logs"("customer_id");

-- AddForeignKey
ALTER TABLE "customer_field_definitions" ADD CONSTRAINT "customer_field_definitions_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_audit_logs" ADD CONSTRAINT "customer_audit_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- GIN index for pg_trgm fuzzy search on customer name
CREATE INDEX IF NOT EXISTS "idx_customers_nome_trgm" ON "customers" USING gin ("nome" gin_trgm_ops);
