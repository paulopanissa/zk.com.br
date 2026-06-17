# Módulo Vendas (PDV Backend) — Implementation Summary

## Status: CONCLUIDO

TypeScript: 0 erros (`tsc --noEmit` limpo)
Lint: eslint não instalado no projeto (módulo ausente em node_modules/.bin)

## Arquivos criados

### Schema
- `apps/api/prisma/schema.prisma` — adicionados: enums VendaStatus, VendaOrigem, VendaPaymentStatus; models Venda, VendaItem, VendaPayment; back-relations em Unit, Customer, Product
- `apps/api/prisma/migrations/20260617160000_vendas/migration.sql` — migration SQL completa

### Módulo
- `apps/api/src/modules/vendas/vendas.module.ts`
- `apps/api/src/modules/vendas/vendas.controller.ts`
- `apps/api/src/modules/vendas/vendas.service.ts`
- `apps/api/src/modules/vendas/vendas.repository.ts`

### DTOs
- `apps/api/src/modules/vendas/dto/create-venda.dto.ts`
- `apps/api/src/modules/vendas/dto/add-item.dto.ts`
- `apps/api/src/modules/vendas/dto/update-item.dto.ts`
- `apps/api/src/modules/vendas/dto/set-discount.dto.ts`
- `apps/api/src/modules/vendas/dto/checkout.dto.ts`
- `apps/api/src/modules/vendas/dto/query-venda.dto.ts`
- `apps/api/src/modules/vendas/dto/sync-offline.dto.ts`
- `apps/api/src/modules/vendas/dto/reconcile-payment.dto.ts`

### Modificados
- `apps/api/src/modules/stock/stock.repository.ts` — extraído `reserveFifoInTx`; `reserveFifo` delega para ele; exportado tipo `PrismaTx`
- `apps/api/src/modules/stock/stock.module.ts` — StockRepository adicionado ao exports
- `apps/api/src/app.module.ts` — VendasModule importado

## TODOs pendentes

- Aplicar migration no banco: `pnpm --filter @zk/api prisma:migrate` (requer banco acessível)
- Instalar eslint no projeto para que `pnpm --filter @zk/api lint` funcione
- Integração com Mercado Pago Point (maquininha PDV) — escopo futuro
- Relatórios de vendas — módulo separado
- Frontend/PWA do PDV — apenas backend implementado
- Testes unitários/e2e do módulo (VendasService — caminho feliz e erros principais)
