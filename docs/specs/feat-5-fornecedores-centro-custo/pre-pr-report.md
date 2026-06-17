# Pre-PR Review Report — feat-5-fornecedores-centro-custo

**Data:** 2026-06-16  
**Revisor:** revisor-erp  
**Status geral:** 🟡 (bloqueio médio + avisos — sem crítico grave, mas há um bug de tenancy real)

---

## Crítico (precisa corrigir)

### 1. Tenancy bypass em `deactivate` de fornecedor — `suppliers.service.ts` linha 146

`deactivate` chama `this.repository.countNFLinks(id)` sem passar `unitId`, e o próprio `countNFLinks` está com corpo stub `return 0`. Isso é um placeholder aceitável enquanto o módulo NF não existe, **mas o maior problema é que `this.repository.deactivate(id)` (linha 153) executa `UPDATE suppliers SET active = false WHERE id = $1` sem nenhum filtro de `unidade_id`**. Um ADMINISTRADOR de uma unidade pode desativar um fornecedor de outra unidade se souber o UUID. A chamada `await this.findById(id, user)` logo acima retorna 404 se o fornecedor não pertencer à unidade — isso funciona como barreira hoje, mas apenas porque `findById` usa `findFirst`. Se o guard falhar por qualquer motivo (bug futuro, mudança de implementação do `findFirst`), o `deactivate` no repositório não tem a proteção em profundidade. Corrija `repository.deactivate` para `WHERE id = $1 AND unidade_id = $2`, recebendo `unitId` como segundo parâmetro e repassando-o do service.

**Arquivo:** `apps/api/src/modules/suppliers/suppliers.repository.ts:99`  
**Arquivo:** `apps/api/src/modules/suppliers/suppliers.service.ts:143-153`

### 2. Hard-delete físico em `deleteAddress` e `deleteContact` sem checagem de cascata

`repository.deleteAddress` e `repository.deleteContact` executam `prisma.supplierAddress.delete` / `prisma.supplierContact.delete` — deleção física sem soft-delete. O schema não tem `deleted_at` nesses modelos, o que é intencional; o problema é que não há nenhuma checagem de referências antes. Mais importante: o `deactivate` do supplier (soft-delete) não impede que endereços e contatos de um fornecedor inativo continuem sendo manipulados — qualquer chamada `POST /:id/addresses` com um `id` de fornecedor desativado vai funcionar normalmente, pois `findById` retorna fornecedores inativos (sem filtro por `active`). Defina se o comportamento desejado é bloquear operações de sub-recursos em fornecedores inativos ou não, e implemente de forma explícita.

**Arquivo:** `apps/api/src/modules/suppliers/suppliers.service.ts:163` (addAddress sem checar `supplier.active`)

---

## Aviso (deveria corrigir)

### 3. `RolesGuard` permite acesso sem `@Roles` — RBAC silencioso

Em `roles.guard.ts` linha 17: `if (!requiredRoles?.length) return true`. Isso significa que qualquer rota **sem** `@Roles(...)` passa pelo guard de RBAC sem qualquer checagem de role, exigindo apenas autenticação JWT. Hoje todas as rotas dos dois módulos têm `@Roles`, então não há brecha atual. O risco é que rotas futuras adicionadas sem o decorator ficam abertas a qualquer usuário autenticado do sistema. Considere inverter o padrão: sem `@Roles` explícito, negar por default (DENY_BY_DEFAULT) e exigir um decorator `@AllRoles()` para rotas que qualquer role pode acessar.

**Arquivo:** `apps/api/src/common/auth/guards/roles.guard.ts:17`

### 4. `validateItemTypeConstraints` aceita `valor_centavos = 0` como válido em VARIAVEL

Em `cost-center.service.ts` linha 213: `if (valor_centavos != null)` — se o cliente enviar `valor_centavos: 0`, essa condição passa `!= null` (0 != null é true) e lança 422. Isso é correto. Porém na verificação FIXO (linha 195): `if (!valor_centavos || valor_centavos < 1)` — `!valor_centavos` é true quando o valor é `0`, o que também está correto. A lógica está consistente, mas o DTO tem `@Min(1)` em `valor_centavos` e `percentual_bps`, então o valor 0 já é rejeitado antes de chegar ao service. Isso é redundante mas inofensivo. O aviso real é: ao fazer `updateItem`, se o cliente enviar apenas `{ tipo: 'FIXO' }` sem `valor_centavos`, o `resolvedValor` vira `item.valor_centavos ?? undefined`. Se o item VARIAVEL existente não tem `valor_centavos`, o `resolvedValor` será `undefined`, e `validateItemTypeConstraints(FIXO, undefined, ...)` vai lançar 422 corretamente — porém a mensagem de erro não deixa claro que o campo precisa ser enviado na mesma requisição de mudança de tipo. Apenas uma questão de UX/doc.

**Arquivo:** `apps/api/src/modules/cost-center/cost-center.service.ts:138-143`

### 5. `linkBrands` itera marcas com `await` em loop — N queries sequenciais

`suppliers.service.ts` linha 249: `for (const brandId of brandIds) { await this.repository.linkBrand(id, brandId); }`. O `linkBrand` usa `upsert`, então é idempotente e correto. O problema é eficiência: N chamadas sequenciais ao banco para vincular N marcas. Use `Promise.all(brandIds.map(...))` para execução paralela, ou um único `createMany` com `skipDuplicates: true`.

**Arquivo:** `apps/api/src/modules/suppliers/suppliers.service.ts:249`

---

## Sugestão (bom ter)

### 6. `countNFLinks` stub sempre retorna 0

`suppliers.repository.ts:172` — o TODO está documentado, mas isso significa que o soft-delete do fornecedor **nunca** vai retornar 409 hoje. Quando o módulo NF for implementado, é fácil esquecer de substituir. Considere lançar um `NotImplementedException` comentado ou adicionar um aviso no log para forçar revisão quando o módulo NF for integrado.

### 7. `findByDocument` no service faz dois roundtrips ao banco

`suppliers.service.ts:87-93` — busca por documento retorna apenas `Supplier` (sem includes), e então faz um segundo `findById` para obter o `SupplierFull`. Poderia ser encapsulado num único método `findFullByDocument(document, unitId)` no repositório.

### 8. Schema: `CostItem.unidade_id` sem índice explícito

`prisma/schema.prisma:346` — `CostItem` tem `unidade_id` como FK e é usado em `getActiveItems(unitId)` com `WHERE unidade_id = $1`. Sem `@@index([unidade_id])` no schema, o Prisma não cria índice. Com volume de itens, essa query de summary vai sofrer. Adicione `@@index([unidade_id])` e `@@index([cost_center_id])` ao modelo `CostItem`.

---

## O que está correto

- **Tenancy nas queries principais:** todas as operações de leitura e escrita no repository recebem `unitId` e aplicam `WHERE unidade_id = $1`. O `TenancyService.resolveUnitId` extrai o escopo do JWT, nunca de parâmetro de client.
- **CNPJ/CPF:** `validateCnpjCpf` implementa módulo-11 completo com rejeição de sequências repetidas. É chamado no `create` e no `update` antes de qualquer persistência. Documento armazenado apenas com dígitos.
- **Valores monetários:** `valor_centavos` e `percentual_bps` são `Int?` no schema Prisma — sem float em nenhum campo. DTOs decorados com `@IsInt()`. Cálculo do summary usa soma de inteiros.
- **Mutual exclusivity FIXO/VARIAVEL:** `validateItemTypeConstraints` cobre os quatro casos (FIXO sem valor, FIXO com percentual, VARIAVEL sem percentual, VARIAVEL com valor) e é chamado tanto no `addItem` quanto no `updateItem`.
- **Soft-delete:** fornecedor usa `active = false`; centro de custo usa `ativo = false`; itens usam `ativo = false`. Nenhuma deleção física de entidades principais.
- **Rotas estáticas antes de paramétrica:** `GET /suppliers/by-document/:document` está declarada antes de `GET /suppliers/:id` no controller. `GET /cost-centers/summary` está declarada antes de `GET /cost-centers/:id`.
- **RBAC:** todas as rotas têm `@Roles(...)` explícito. Auth e roles guards são globais via `APP_GUARD`. Nenhum `@Public()` acidental nos dois módulos.
- **Separação de camadas:** controller sem lógica de negócio; service orquestra regras; repository concentra queries Prisma.
