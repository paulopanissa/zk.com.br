# Build Summary — feat-9: Lotes + Engine de Precificação

Implementados os módulos 4 (Lotes) e 9 (PricingEngine) na API NestJS conforme spec, seguindo o padrão Controller → Service → Repository do projeto.

**Módulo Lots** (`apps/api/src/modules/lots/`): CRUD completo com 7 endpoints protegidos por RBAC (ADMINISTRADOR e OPERADOR_ESTOQUE_COMPRAS); listagem paginada com filtros; rota FIFO por produto (`GET /lots/by-product/:productId`); rota de vencimento (`GET /lots/expiring?days=N`); regras de imutabilidade de `product_id` e `quantity_received` enforçadas no service; saldo retornado como stub 0 (aguarda módulo 5 de movimentações); soft-delete com guarda de saldo; unicidade `(unidade_id, product_id, code)` com 409 em duplicata. O stub `countLoteLinks` em `products.repository.ts` foi atualizado para consultar a tabela `lots` real.

**Módulo PricingEngine** (`apps/api/src/modules/pricing-engine/`): serviço puro de cálculo sem banco/repository; aritmética 100% inteira (centavos e basis points, com `Math.floor` nas parcelas e `Math.ceil` no preço sugerido); `POST /pricing-engine/calculate` com roles ADMINISTRADOR e OPERADOR_PDV; módulo exporta `PricingEngineService` para injeção em Produtos e PDV.

**Schema Prisma**: model `Lot` adicionado com back-relations em `Unit` e `Product`; `prisma generate` executado com sucesso; `tsc --noEmit` sem erros.

**TODOs pendentes**: (1) Criar e aplicar migration Prisma para a tabela `lots` (`pnpm --filter @zk/api prisma:migrate`). (2) Substituir o stub `getBalance` em `LotsRepository` pela query real em `stock_movements` quando o módulo 5 for implementado.
