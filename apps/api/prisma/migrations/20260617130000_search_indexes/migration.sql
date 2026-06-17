-- pg_trgm already enabled (migration 20260617124950_clientes)
CREATE INDEX IF NOT EXISTS "idx_products_name_trgm"
  ON "products" USING gin ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_suppliers_razao_social_trgm"
  ON "suppliers" USING gin ("razao_social" gin_trgm_ops);
