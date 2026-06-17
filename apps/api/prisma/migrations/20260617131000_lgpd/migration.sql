CREATE TYPE "LgpdRequestType" AS ENUM ('EXPORTACAO', 'EXCLUSAO', 'RETIFICACAO', 'REVOGACAO_CONSENTIMENTO');
CREATE TYPE "LgpdRequestStatus" AS ENUM ('PENDENTE', 'EM_PROCESSAMENTO', 'CONCLUIDA', 'REJEITADA');

CREATE TABLE "lgpd_data_requests" (
    "id" TEXT NOT NULL,
    "unidade_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "tipo" "LgpdRequestType" NOT NULL,
    "status" "LgpdRequestStatus" NOT NULL DEFAULT 'PENDENTE',
    "descricao" TEXT,
    "solicitado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prazo_legal" TIMESTAMP(3) NOT NULL,
    "processado_em" TIMESTAMP(3),
    "processado_por" TEXT,
    "justificativa" TEXT,
    "dados_exportados" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lgpd_data_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_lgpd_requests_unidade_status" ON "lgpd_data_requests"("unidade_id", "status");
CREATE INDEX "idx_lgpd_requests_customer" ON "lgpd_data_requests"("customer_id");

ALTER TABLE "lgpd_data_requests" ADD CONSTRAINT "lgpd_data_requests_unidade_id_fkey"
    FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lgpd_data_requests" ADD CONSTRAINT "lgpd_data_requests_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
