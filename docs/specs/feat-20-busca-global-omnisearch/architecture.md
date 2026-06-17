# Arquitetura — Busca Global (Omnisearch)

## Visão geral (antes → depois)

Antes: busca inexistente; cada módulo tem sua própria listagem filtrada.  
Depois: único endpoint `GET /api/v1/search?q=<termo>` retorna resultados agrupados por tipo, respeitando RBAC e escopo de unidade.

## Componentes afetados

- **Novo módulo:** `apps/api/src/modules/search/`
- **Nova migration:** índices pg_trgm GIN em `products.name` e `suppliers.razao_social`
- **AppModule:** importar `SearchModule`

## Entidades pesquisáveis e campos

| Tipo | Tabela | Campos pesquisados | Visível por |
|------|--------|--------------------|-------------|
| `products` | `products` | `name`, `sku`, `barcode` | ADMINISTRADOR, OPERADOR_PDV |
| `customers` | `customers` | `nome`, `email` | ADMINISTRADOR, OPERADOR_PDV |
| `suppliers` | `suppliers` | `razao_social`, `nome_fantasia` | ADMINISTRADOR |
| `categories` | `categories` | `name` | ADMINISTRADOR |
| `brands` | `brands` | `name` | ADMINISTRADOR |

## Estratégia de busca

- `pg_trgm` similarity (threshold 0.3) + `ILIKE '%q%'` para todos os tipos
- GIN index em `products.name` e `suppliers.razao_social` (nova migration)
- `customers.nome` já tem GIN index (migration de Clientes)
- Queries executadas em paralelo via `Promise.all` — cada tipo tem sua own `$queryRaw`
- Filtro `deleted_at IS NULL` + `active = true` em todas as queries

## Contrato da API

```
GET /api/v1/search?q=golden&types=products,customers&limit=5

Request:
  q       — string, 2-100 chars, obrigatório
  types   — CSV de SearchEntityType, opcional (padrão: tudo visível ao role)
  limit   — int 1-20, padrão 5 (por grupo)

Response 200:
{
  "q": "golden",
  "took_ms": 42,
  "results": {
    "products":   [{ "id", "name", "sku", "barcode", "active" }],
    "customers":  [{ "id", "nome", "email", "ativo" }],
    "suppliers":  [{ "id", "razao_social", "nome_fantasia", "active" }],
    "categories": [{ "id", "name", "slug", "active" }],
    "brands":     [{ "id", "name", "slug", "active" }]
  }
}

Response 422: q < 2 chars ou q vazio
Response 403: tipo solicitado fora do RBAC do usuário
```

## RBAC

- `OPERADOR_PDV` só pode ver `products` e `customers` — qualquer outro tipo em `types=` retorna 403
- `ADMINISTRADOR` vê todos os 5 tipos
- Scope obrigatório: todas as queries filtram por `unidade_id` via TenancyService

## Padrões mantidos

- Controller → Service → Repository (raw SQL direto no service por ser cross-entity)
- `@Roles()` + `JwtSystemGuard` + `RolesGuard` via APP_GUARD global
- DTOs com `class-validator`; `ValidationPipe` global com `whitelist: true`
- Swagger docs em todos os endpoints

## Principais arquivos a criar

- `apps/api/src/modules/search/search.module.ts`
- `apps/api/src/modules/search/search.controller.ts`
- `apps/api/src/modules/search/search.service.ts`
- `apps/api/src/modules/search/dto/query-search.dto.ts`
- `apps/api/src/modules/search/types/search-results.type.ts`
- `apps/api/prisma/migrations/<timestamp>_search_indexes/migration.sql`
- `apps/api/src/app.module.ts` — adicionar SearchModule

## Trade-offs

- Raw SQL no service (em vez de repository) — queries são cross-entity e não têm um "repositório" natural; centraliza a lógica de busca em um único lugar
- ILIKE + similarity sem cache Redis — aceitável para o volume P0; cache pode ser adicionado depois
- Sem score/ranking sofisticado — similaridade pg_trgm é suficiente para o MVP

## Consequências conhecidas

- Sem busca dentro de `dados_dinamicos` (JSON) dos clientes — não indexável de forma eficiente sem jsonb GIN separado
- CPF/CNPJ de clientes não é pesquisável via busca global (hash não está no escopo deste endpoint — use `GET /customers?cpf_cnpj=...`)
