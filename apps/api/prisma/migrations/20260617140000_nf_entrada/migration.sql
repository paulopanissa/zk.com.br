-- CreateEnum
CREATE TYPE "NfEntradaStatus" AS ENUM ('RASCUNHO', 'CONFIRMADA', 'CANCELADA');

-- CreateTable nf_entradas
CREATE TABLE "nf_entradas" (
    "id"            TEXT NOT NULL,
    "unidade_id"    TEXT NOT NULL,
    "fornecedor_id" TEXT,
    "numero"        VARCHAR(10) NOT NULL,
    "serie"         VARCHAR(3),
    "chave_acesso"  CHAR(44),
    "data_emissao"  DATE NOT NULL,
    "data_entrada"  DATE,
    "valor_total"   INTEGER NOT NULL DEFAULT 0,
    "status"        "NfEntradaStatus" NOT NULL DEFAULT 'RASCUNHO',
    "xml_url"       TEXT,
    "pdf_url"       TEXT,
    "observacao"    TEXT,
    "created_by"    TEXT NOT NULL,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nf_entradas_pkey" PRIMARY KEY ("id")
);

-- CreateTable nf_entrada_items
CREATE TABLE "nf_entrada_items" (
    "id"              TEXT NOT NULL,
    "nf_entrada_id"   TEXT NOT NULL,
    "numero_item"     INTEGER NOT NULL,
    "codigo_produto"  VARCHAR(60),
    "ean"             VARCHAR(14),
    "descricao"       VARCHAR(500) NOT NULL,
    "ncm"             VARCHAR(8),
    "cfop"            VARCHAR(4),
    "unidade_medida"  VARCHAR(6),
    "quantidade"      DECIMAL(12,3) NOT NULL,
    "valor_unitario"  INTEGER NOT NULL,
    "valor_total"     INTEGER NOT NULL,
    "lote_numero"     VARCHAR(100),
    "data_validade"   DATE,
    "data_fabricacao" DATE,
    "product_id"      TEXT,
    "brand_id"        TEXT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nf_entrada_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nf_entradas_unidade_id_chave_acesso_key"
    ON "nf_entradas"("unidade_id", "chave_acesso")
    WHERE "chave_acesso" IS NOT NULL;

CREATE INDEX "idx_nf_entradas_unidade_status" ON "nf_entradas"("unidade_id", "status");
CREATE INDEX "idx_nf_entradas_fornecedor" ON "nf_entradas"("fornecedor_id");
CREATE INDEX "idx_nf_entrada_items_nf" ON "nf_entrada_items"("nf_entrada_id");
CREATE INDEX "idx_nf_entrada_items_product" ON "nf_entrada_items"("product_id");

-- AddForeignKey
ALTER TABLE "nf_entradas"
    ADD CONSTRAINT "nf_entradas_unidade_id_fkey"
    FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nf_entradas"
    ADD CONSTRAINT "nf_entradas_fornecedor_id_fkey"
    FOREIGN KEY ("fornecedor_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nf_entrada_items"
    ADD CONSTRAINT "nf_entrada_items_nf_entrada_id_fkey"
    FOREIGN KEY ("nf_entrada_id") REFERENCES "nf_entradas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "nf_entrada_items"
    ADD CONSTRAINT "nf_entrada_items_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nf_entrada_items"
    ADD CONSTRAINT "nf_entrada_items_brand_id_fkey"
    FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Formalizar FK orphan: lots.invoice_item_id → nf_entrada_items.id
ALTER TABLE "lots"
    ADD CONSTRAINT "lots_invoice_item_id_fkey"
    FOREIGN KEY ("invoice_item_id") REFERENCES "nf_entrada_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
