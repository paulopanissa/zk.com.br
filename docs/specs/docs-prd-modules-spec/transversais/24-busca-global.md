# 24. Busca Global (Omnisearch)

**Domínio:** Transversal & Infraestrutura
**Prioridade:** P0
**Path NestJS:** `apps/api/src/common/search/`

---

## Responsabilidade

Prover uma rota única de busca full-text para a searchbar do admin (ERP), retornando resultados agrupados por tipo de entidade e respeitando as permissões RBAC do usuário autenticado.

## Entidades / Interfaces

Este módulo não possui entidades persistidas próprias. Consome entidades de outros módulos via queries PostgreSQL.

### Contratos internos

```typescript
interface SearchResult {
  type: SearchResultType
  id: uuid
  title: string
  subtitle?: string       // informação de apoio (ex: SKU, CNPJ, código de lote)
  href: string            // path do frontend para navegar ao item
  score: number           // relevância (ts_rank)
}

enum SearchResultType {
  PRODUTO   = 'produto',
  FORNECEDOR = 'fornecedor',
  NOTA_FISCAL = 'nota_fiscal',
  LOTE       = 'lote',
  CLIENTE    = 'cliente',
}

interface SearchResponse {
  query: string
  total: number
  results: Record<SearchResultType, SearchResult[]>
}
```

### Índices FTS esperados nas tabelas-alvo

Cada módulo proprietário da entidade é responsável por manter os `tsvector` e índices GIN:

| Tabela | Coluna tsvector | Campos indexados |
|--------|----------------|-----------------|
| `products` | `search_vector` | nome, descrição, SKU, NCM |
| `suppliers` | `search_vector` | razão social, nome fantasia, CNPJ |
| `invoices` | `search_vector` | número NF, CNPJ emitente, chave de acesso |
| `batches` | `search_vector` | código do lote, produto nome |
| `customers` | `search_vector` | nome, CPF (mascarado), e-mail |

## Endpoints / API Pública

| Método | Path | Descrição | Autenticação |
|--------|------|-----------|--------------|
| GET | `/search?q={termo}&limit={n}&types={tipo1,tipo2}` | Busca omnisearch | Bearer (system) |

### Query Params

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `q` | string | — | Termo de busca (min. 2 chars, max. 100 chars) |
| `limit` | number | 5 | Resultados por tipo (1–20) |
| `types` | string[] | todos | Filtro de tipos (opcional) |

### Resposta de exemplo

```json
{
  "query": "whiskas",
  "total": 12,
  "results": {
    "produto": [
      {
        "type": "produto",
        "id": "uuid",
        "title": "Ração Whiskas Adulto 1kg",
        "subtitle": "SKU: WK-001",
        "href": "/produtos/uuid",
        "score": 0.98
      }
    ],
    "fornecedor": [],
    "nota_fiscal": [],
    "lote": [],
    "cliente": []
  }
}
```

## Regras de Negócio

- A busca é exclusiva do admin (realm `system`); não há busca omnisearch para o e-commerce (fora de escopo no v1).
- O escopo de unidade do usuário autenticado é aplicado: operadores restritos a uma `unidade_id` visualizam apenas dados da sua unidade; administradores visualizam tudo.
- Visibilidade por papel (RBAC): `OPERADOR_PDV` não vê notas fiscais nem fornecedores; `OPERADOR_ESTOQUE_COMPRAS` não vê clientes por padrão. A filtragem por `types` é validada contra as permissões do papel — tipos não autorizados são silenciosamente omitidos.
- A busca usa PostgreSQL `plainto_tsquery` para tratar entrada do usuário com segurança (sem injeção de operadores FTS). Ranqueamento via `ts_rank_cd`.
- `pg_trgm` complementa FTS para tolerância a erros de digitação e buscas por substrings (ex: "whisks" encontra "Whiskas").
- Termo de busca com menos de 2 caracteres retorna `400 Bad Request`.
- CPF e dados PII de clientes são mascarados no `subtitle` do resultado (ex: `CPF: ***.***.***-45`); nunca retornar PII completa.
- Resultados de clientes exibem apenas dados necessários para identificação; a busca de clientes requer papel `ADMINISTRADOR` ou `OPERADOR_PDV`.
- Cache Redis por `(query_normalizada, unidade_id, role)` com TTL de 30 segundos — adequado para searchbar interativa.
- Motor dedicado (Meilisearch/Typesense) somente se volume de SKUs/fornecedores/clientes superar milhões de registros combinado com alta concorrência de busca. Postgres é o padrão.

## Invariantes Críticos

- **Escopo de tenancy:** nenhum resultado de outra `unidade_id` pode vazar para um operador com escopo restrito.
- **RBAC na busca:** tipos sem permissão são omitidos, não retornados com erro — evitar enumeração de recursos existentes.
- **PII mascarada:** CPF, e-mail e telefone de clientes nunca aparecem completos nos resultados de busca.
- **Queries parametrizadas:** o termo de busca passa sempre por `plainto_tsquery` ou `websearch_to_tsquery`; nunca interpolado em SQL.

## Dependências

- **Upstream (usa):**
  - `apps/api/src/common/auth/` — JWT guard e contexto RBAC
  - PostgreSQL — `search_vector` GIN index em `products`, `suppliers`, `invoices`, `batches`, `customers`
  - Redis — cache de resultados (TTL curto)
  - `apps/api/src/modules/produtos/` — query de produtos
  - `apps/api/src/modules/fornecedores/` — query de fornecedores
  - `apps/api/src/modules/notas-fiscais/` — query de notas
  - `apps/api/src/modules/lotes/` — query de lotes
  - `apps/api/src/modules/clientes/` — query de clientes

- **Downstream (usado por):**
  - Frontend `apps/admin/` — searchbar global do ERP

## Skills Relevantes

- `nestjs-erp-module` — estrutura do módulo, DTO de query, controller
- `seguranca-lgpd` — mascaramento de PII nos resultados, RBAC, queries parametrizadas

## Agentes Relevantes

- `revisor-erp` — verificar escopo de tenancy e RBAC após alterações
- `auditor-seguranca-lgpd` — verificar mascaramento de PII antes de releases

## Critérios de Aceite

- [ ] `GET /search?q=whiskas` retorna resultados agrupados por `produto`, `fornecedor`, `nota_fiscal`, `lote`, `cliente`.
- [ ] `GET /search?q=x` (1 char) retorna `400 Bad Request`.
- [ ] Usuário com `unidade_id = A` não vê resultados de produtos exclusivos da unidade B.
- [ ] `OPERADOR_PDV` não recebe resultados do tipo `nota_fiscal` nem `fornecedor`, mesmo sem passar o parâmetro `types`.
- [ ] CPF de cliente no campo `subtitle` aparece mascarado (nunca completo).
- [ ] Busca por "whisks" (com erro de digitação) encontra "Whiskas" via `pg_trgm`.
- [ ] Segunda chamada idêntica em menos de 30s é servida do cache Redis.
- [ ] Busca sem token retorna `401`.
- [ ] Endpoint documentado no Swagger com todos os query params e schema de resposta.
