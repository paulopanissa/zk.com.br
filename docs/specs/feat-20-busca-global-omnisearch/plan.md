# Busca Global (Omnisearch) — feat/20

Se retomando este trabalho, atualize este arquivo conforme progride.

## FASE 1 — Migration + GIN indexes [Não Iniciada ⏳]

Criar migration que adiciona índices pg_trgm nos campos de busca das entidades ainda sem cobertura.

### Tarefa A — migration_search_indexes [Não Iniciada ⏳]
Arquivo: `apps/api/prisma/migrations/<ts>_search_indexes/migration.sql`

```sql
-- products: GIN index em name para pg_trgm
CREATE INDEX IF NOT EXISTS "idx_products_name_trgm"
  ON "products" USING gin ("name" gin_trgm_ops);

-- suppliers: GIN index em razao_social e nome_fantasia
CREATE INDEX IF NOT EXISTS "idx_suppliers_razao_social_trgm"
  ON "suppliers" USING gin ("razao_social" gin_trgm_ops);
```

Notas:
- pg_trgm já habilitado (migration de Clientes)
- customers.nome já tem GIN index
- categories.name e brands.name são tabelas pequenas; ILIKE suficiente

### Testes desta fase
- [ ] `pnpm --filter @zk/api prisma:migrate` sem erros
- [ ] Indexes existem no banco: `\di idx_products_name_trgm`

## FASE 2 — Módulo Search [Não Iniciada ⏳]

Criar o módulo completo com controller, service e DTOs.

### Tarefa A — DTO QuerySearchDto [Não Iniciada ⏳]
Arquivo: `apps/api/src/modules/search/dto/query-search.dto.ts`

```typescript
enum SearchEntityType { PRODUCTS='products', CUSTOMERS='customers', SUPPLIERS='suppliers', CATEGORIES='categories', BRANDS='brands' }

class QuerySearchDto {
  @IsString() @MinLength(2) @MaxLength(100) q: string
  @IsEnum(SearchEntityType, { each: true }) @IsOptional() types?: SearchEntityType[]
  @IsInt() @Min(1) @Max(20) @IsOptional() limit?: number = 5
}
```

### Tarefa B — types/search-results.type.ts [Não Iniciada ⏳]
Interfaces para cada resultado parcial:
```typescript
ProductResult { id, name, sku, barcode, active }
CustomerResult { id, nome, email, ativo }
SupplierResult { id, razao_social, nome_fantasia, active }
CategoryResult { id, name, slug, active }
BrandResult { id, name, slug, active }
SearchResults { q, took_ms, results: { products?, customers?, suppliers?, categories?, brands? } }
```

### Tarefa C — SearchService [Não Iniciada ⏳]
Arquivo: `apps/api/src/modules/search/search.service.ts`

- Método `search(q, unitId, visibleTypes, limit): Promise<SearchResults>`
- `Promise.all([searchProducts(...), searchCustomers(...), ...])` — paralelizado
- Cada método privado: `$queryRaw` com similarity + ILIKE
- `deleted_at IS NULL` em Customer; `active = true` nos demais
- `took_ms` calculado com `Date.now()` ao redor do `Promise.all`

### Tarefa D — SearchController [Não Iniciada ⏳]
Arquivo: `apps/api/src/modules/search/search.controller.ts`

- `GET /search`
- `@Roles(SystemRole.ADMINISTRADOR, SystemRole.OPERADOR_PDV)`
- Resolve `visibleTypes` com base no role:
  - ADMINISTRADOR: todos os 5 tipos (ou filtrado por `types=`)
  - OPERADOR_PDV: apenas `products` e `customers` (retorna 403 se `types=` contiver outro)
- Chama `tenancy.resolveUnitId(user)` para obter `unitId`

### Tarefa E — SearchModule + AppModule [Não Iniciada ⏳]
- `search.module.ts`: imports PrismaModule, TenancyModule? (tenancy é @Global — não precisa)
- `app.module.ts`: adicionar SearchModule

### Testes desta fase
- [ ] `pnpm --filter @zk/api exec tsc --noEmit` sem erros
- [ ] `GET /api/v1/search?q=a` → 422 (< 2 chars)
- [ ] `GET /api/v1/search?q=` → 422
- [ ] `GET /api/v1/search?q=test` → 200 com `results` agrupados
- [ ] OPERADOR_PDV com `?types=suppliers` → 403

## Invariantes críticos
- Escopo obrigatório: `unidade_id` em TODAS as queries
- OPERADOR_PDV não vê suppliers/categories/brands
- CPF/CNPJ (dado encriptado) nunca exposto; email de cliente exposto apenas como substring de busca (não campo livre retornado em claro — esperar: sim, retorna email não-sensível)
- `q` mínimo 2 chars para evitar index scan total

## Decisões tomadas
- Raw SQL no service em vez de repository (cross-entity, sem repositório natural)
- 5 resultados por grupo por padrão (configurável 1-20)
- Categories e Brands sem GIN index (tabelas pequenas, ILIKE suficiente)
- Sem cache Redis no MVP (pode ser adicionado depois)
