-- CreateEnum
CREATE TYPE "DeliveryProvider" AS ENUM ('UBER_DIRECT', 'FRETE_GRATIS');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM (
  'PENDING',
  'SCHEDULED',
  'EN_ROUTE_TO_PICKUP',
  'ARRIVED_AT_PICKUP',
  'EN_ROUTE_TO_DROPOFF',
  'ARRIVED_AT_DROPOFF',
  'COMPLETED',
  'FAILED',
  'CANCELED'
);

-- CreateTable delivery_configs
CREATE TABLE "delivery_configs" (
  "id"                               TEXT          NOT NULL,
  "unidade_id"                       TEXT          NOT NULL,
  "provider"                         "DeliveryProvider" NOT NULL DEFAULT 'UBER_DIRECT',
  "active"                           BOOLEAN       NOT NULL DEFAULT true,
  "credentials_encrypted"            TEXT          NOT NULL,
  "free_shipping_threshold_centavos" INTEGER,
  "created_at"                       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                       TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "delivery_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_configs_unidade_id_key" ON "delivery_configs"("unidade_id");

ALTER TABLE "delivery_configs"
  ADD CONSTRAINT "delivery_configs_unidade_id_fkey"
  FOREIGN KEY ("unidade_id") REFERENCES "units"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable deliveries
CREATE TABLE "deliveries" (
  "id"                TEXT              NOT NULL,
  "unidade_id"        TEXT              NOT NULL,
  "venda_id"          TEXT              NOT NULL,
  "config_id"         TEXT              NOT NULL,
  "provider"          "DeliveryProvider" NOT NULL,
  "status"            "DeliveryStatus"  NOT NULL DEFAULT 'PENDING',
  "uber_delivery_id"  TEXT,
  "uber_quote_id"     TEXT,
  "tracking_url"      TEXT,
  "fee_centavos"      INTEGER           NOT NULL DEFAULT 0,
  "recipient_name"    VARCHAR(200)      NOT NULL,
  "recipient_phone"   VARCHAR(20)       NOT NULL,
  "dropoff_address"   VARCHAR(500)      NOT NULL,
  "pickup_address"    VARCHAR(500)      NOT NULL,
  "provider_response" JSONB,
  "error_message"     TEXT,
  "created_at"        TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3)      NOT NULL,

  CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deliveries_venda_id_key" ON "deliveries"("venda_id");
CREATE INDEX "deliveries_unidade_id_status_idx" ON "deliveries"("unidade_id", "status");
CREATE INDEX "deliveries_unidade_id_created_at_idx" ON "deliveries"("unidade_id", "created_at");

ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_config_id_fkey"
  FOREIGN KEY ("config_id") REFERENCES "delivery_configs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_unidade_id_fkey"
  FOREIGN KEY ("unidade_id") REFERENCES "units"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
