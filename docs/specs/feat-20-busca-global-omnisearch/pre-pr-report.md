# Pre-PR Report — feat-20-busca-global-omnisearch

## revisor-erp

**Status: 🟡 Aviso — nenhum invariante crítico quebrado, mas há 2 problemas que devem ser corrigidos antes do merge.**

---

### Crítico (precisa corrigir)

_Nenhum invariante crítico quebrado. Os pontos abaixo são classificados como Aviso mas são obrigatórios antes do merge por risco real de regressão ou inconsistência._

---

### Aviso (deveria corrigir)

**1. `searchCustomers` filtra `deleted_at IS NULL` mas não filtra `ativo = false`**

Arquivo: `apps/api/src/modules/search/search.service.ts`, linha 96–107

A query de clientes possui `AND deleted_at IS NULL` (soft-delete correto), mas não possui `AND ativo = true`. O schema (`Customer.ativo`) permite desativar um cliente sem excluí-lo. Um cliente inativo continuará aparecendo na omnisearch para o operador de PDV, o que é inconsistente com o comportamento de produtos, fornecedores, categorias e marcas — todos filtram `active = true` / `ativo = true`. Corrija adicionando `AND ativo = true` à cláusula WHERE de `searchCustomers`.

**2. `SearchModule` declara `TenancyService` no controller mas não importa `TenancyModule`**

Arquivo: `apps/api/src/modules/search/search.module.ts`, linha 1–9

`SearchController` injeta `TenancyService` no construtor, mas `SearchModule` não declara nem importa `TenancyService`. O módulo funciona hoje apenas porque `TenancyModule` é `@Global()` (o que mascara a dependência implícita). Se `@Global()` for removido de `TenancyModule` no futuro — o que é uma refatoração legítima — o módulo quebrará em runtime sem nenhum aviso em tempo de compilação. Adicione `TenancyModule` aos `imports` de `SearchModule` para tornar a dependência explícita e resistente a refatorações.

---

### Sugestão (bom ter)

**3. Falta `repository` layer — service acessa Prisma diretamente**

Arquivo: `apps/api/src/modules/search/search.service.ts`

A convenção do projeto (skill `nestjs-erp-module`) exige a camada `<feature>.repository.ts` como único ponto de acesso a dados. `SearchService` chama `this.prisma.$queryRaw` diretamente, quebrando a separação de camadas. Para um módulo read-only simples como este o risco prático é baixo, mas cria precedente que inconsistente com os demais módulos do ERP. Considere extrair os cinco métodos `search*` para um `SearchRepository`.

**4. Migration cria índices trgm apenas para `products.name` e `suppliers.razao_social` — falta `customers.nome`**

Arquivo: `apps/api/prisma/migrations/20260617130000_search_indexes/migration.sql`

A query de clientes usa `similarity(nome, ...)` (linha 100 do service), mas não há índice GIN `gin_trgm_ops` sobre `customers.nome`. O fallback ILIKE ainda funciona, mas a similaridade trigram faz sequential scan na coluna. Adicione `CREATE INDEX IF NOT EXISTS "idx_customers_nome_trgm" ON "customers" USING gin ("nome" gin_trgm_ops)` à migration (ou em uma migration complementar).

**5. `TenancyService.resolveUnitId` faz query ao banco para ADMIN sem `unidade_id`**

Arquivo: `apps/api/src/common/tenancy/tenancy.service.ts`, linha 13–17

Em um endpoint de alta frequência como omnisearch, um ADMIN sem `unidade_id` no token dispara um SELECT extra a cada requisição. Não é um bug, mas é um hotspot de performance. Se o sistema estará sempre com MATRIZ configurada e o token puder carregar o `unidade_id` no momento do login, prefira resolver o `unidade_id` na emissão do token e eliminar essa query de resolução em tempo de request.

---

### O que está correto

- SQL injection: todos os `$queryRaw` usam template literals parametrizados do Prisma — nenhuma concatenação de string com input do usuário. Seguro.
- Tenancy: todas as cinco queries incluem `WHERE unidade_id = ${unitId}` derivado do contexto autenticado, nunca de parâmetro do cliente.
- PII: `CustomerResult` expõe apenas `id`, `nome`, `email`, `ativo` — `cpf_cnpj_enc`, `cpf_cnpj_hash` e `data_nascimento_enc` não aparecem na resposta nem na query SELECT. Correto.
- RBAC: `@Roles(ADMINISTRADOR, OPERADOR_PDV)` + `JwtSystemGuard` + `RolesGuard` globais cobrem o endpoint. A lógica de restrição de tipos por role está no controller com ForbiddenException bem tipada.
- Validação de entrada: `@MinLength(2)` em `q` previne full-table scan; `@Max(20)` em `limit` limita o custo. `ValidationPipe` global com `whitelist: true` ativo.
- Soft-delete de customers: `deleted_at IS NULL` presente.
- `active = true` em produtos, fornecedores, categorias e marcas: presente em todos.
- Realm do sistema: `JwtSystemPayload.realm === 'system'` é verificado pela estratégia JWT; nenhum cruzamento com o realm de e-commerce.
- Rate limiting: `ThrottlerGuard` global registrado no `AppModule` antes de `JwtSystemGuard`.
