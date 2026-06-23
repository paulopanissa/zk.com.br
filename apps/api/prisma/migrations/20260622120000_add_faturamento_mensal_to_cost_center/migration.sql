-- AlterTable: adiciona faturamento mensal ao centro de custo para rateio proporcional SEBRAE
ALTER TABLE "cost_centers" ADD COLUMN "faturamento_mensal_centavos" INTEGER;
