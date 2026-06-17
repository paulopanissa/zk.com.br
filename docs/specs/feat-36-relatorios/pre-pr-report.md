# Relatório Pré-PR — Módulo `relatorios` (feat-36)

Data: 2026-06-17
Revisor: revisor-erp

Arquivos revisados:
- `apps/api/src/modules/relatorios/relatorios.service.ts`
- `apps/api/src/modules/relatorios/relatorios.repository.ts`
- `apps/api/src/modules/relatorios/relatorios.controller.ts`
- `apps/api/src/modules/relatorios/relatorios.module.ts`
- `apps/api/src/modules/relatorios/dto/query-vendas.dto.ts`
- `apps/api/src/modules/relatorios/dto/query-estoque.dto.ts`
- `apps/api/src/modules/relatorios/dto/query-clientes.dto.ts`
- `apps/api/src/modules/relatorios/dto/query-produtos.dto.ts`

---

## Crítico (precisa corrigir)

### C1 — `queryLotesProximosVencimento` filtra por `quantity_received` em vez do saldo atual

**Arquivo:** `relatorios.repository.ts`, linha 216

```sql
AND l.quantity_received > 0
```

`quantity_received` é a quantidade que entrou no lote na nota fiscal — nunca muda após o recebimento. O saldo real do lote é a soma das movimentações em `stock_movements` (saídas são gravadas com quantidade negativa, conforme `stock.repository.ts` linha 327). Um lote completamente consumido mantém `quantity_received > 0` e continuará aparecendo no relatório de vencimento como se ainda tivesse estoque disponível.

**Impacto:** O relatório de "lotes próximos ao vencimento" mostra lotes zerados, gerando alertas falsos e obrigando o operador a verificar na tela de estoque antes de qualquer ação. Em uma operação com alto giro, praticamente todos os alertas serão ruído.

**Correção:**

```sql
SELECT
  l.id, l.code, l.expires_at, l.quantity_received,
  p.id AS product_id, p.name AS product_name, p.sku
FROM lots l
JOIN products p ON p.id = l.product_id
WHERE l.unidade_id = ${unitId}
  AND l.expires_at IS NOT NULL
  AND l.expires_at <= NOW() + (${thresholdDias} * interval '1 day')
GROUP BY l.id, p.id, p.name, p.sku
HAVING COALESCE(
  (SELECT SUM(sm.quantity)
   FROM stock_movements sm
   WHERE sm.lot_id = l.id AND sm.unidade_id = ${unitId}), 0
) > 0
ORDER BY l.expires_at ASC
LIMIT 50
```

Ou mover a subquery para o WHERE como condição EXISTS sobre saldo positivo.

---

## Aviso (deveria corrigir)

### A1 — Cálculo de margem duplicado: SQL ordena por fórmula diferente do valor retornado no JSON

**Arquivo:** `relatorios.repository.ts`, linhas 327–328 e 353–354 (ORDER BY em SQL) vs `relatorios.service.ts`, linhas 334–339 (JS `mapProduto`)

O `ORDER BY` do ranking usa `AVG(vi.preco_unitario_centavos)` bruto como base de cálculo. O `margem_bps` retornado ao cliente é recalculado em JS sobre `Math.round(this.toInt(r.preco_medio_centavos))` — valor já arredondado. Em edge cases onde o arredondamento muda o centavo do preço médio, um produto pode aparecer em posição X no ranking mas ter `margem_bps` divergente do critério de ordenação.

**Correção preferida:** Selecionar `margem_bps` como coluna calculada no SQL (já existe como subexpressão no ORDER BY) e retorná-la diretamente, eliminando o recálculo em JS.

```sql
ROUND((AVG(vi.preco_unitario_centavos) - pp.cost_price_cents::numeric)
      / NULLIF(AVG(vi.preco_unitario_centavos), 0) * 10000) AS margem_bps
```

### A2 — `customer.nome` (PII) exposto diretamente na resposta `top_compradores` sem aviso de auditoria

**Arquivo:** `relatorios.repository.ts`, linha 264 (`c.nome`)

O schema de `Customer` tem CPF/CNPJ criptografado mas `nome` em plaintext. Retornar nome de cliente em uma listagem de relatório é PII exposta. Não é um bug funcional, mas viola o princípio de exposição mínima da skill `seguranca-lgpd`. O endpoint responde a qualquer `ADMINISTRADOR` — sem log de auditoria de quem consultou esses dados.

**Ação sugerida:** Registrar acesso ao relatório de clientes no `CustomerAuditLog` (tabela já existe no schema). Avaliar se o nome é necessário no contexto de "top compradores" ou se o `id` + contagem basta para a tela de listagem, exibindo o nome só no drill-down.

### A3 — Relatórios executam múltiplas queries pesadas síncronas na requisição HTTP

**Arquivo:** `relatorios.service.ts`, todos os métodos (`getVendas`, `getEstoque`, `getClientes`, `getProdutos`)

O CLAUDE.md e a skill `nestjs-erp-module` orientam que relatórios grandes vão para fila (RabbitMQ). As queries atuais executam JOINs e SUMs sobre toda a tabela de vendas sem indexação de período visível. Não é problema hoje com volume baixo, mas o padrão está errado desde o início: conforme a base crescer, vai saturar a pool de conexões da API.

**Ação:** Planejar migração para execução assíncrona (worker publica resultado em Redis com TTL, endpoint retorna o cache ou `202 Accepted` com polling) antes de escalar.

---

## Sugestão (bom ter)

### S1 — Subquery `MAX(cost_price_cents)` em `product_pricing` é redundante dado o `@unique` no schema

**Arquivo:** `relatorios.repository.ts`, linhas 317–320 e análogo em ~340, ~378, ~402

`ProductPricing` tem `product_id @unique` no schema Prisma — existe exatamente uma linha por produto. O `MAX(... GROUP BY product_id)` é correto mas desnecessariamente defensivo. Uma `INNER JOIN` direta simplifica as queries e remove o subquery desnecessário. Se a cardinalidade mudar no futuro (pricing por canal, por unidade), o subquery volta a ser necessário — vale um comentário no código explicando a escolha.

### S2 — `double Math.round` em `mapProduto`

**Arquivo:** `relatorios.service.ts`, linhas 335 e 345

```ts
const precoMedio = Math.round(this.toInt(r.preco_medio_centavos));
// ...
unidades_vendidas: Math.round(this.toInt(r.unidades_vendidas)),
```

`this.toInt()` já executa `Math.round()` internamente. O `Math.round` externo é idempotente para inteiros, mas o código diz que o revisor (humano ou futuro) pode concluir que `toInt` não arredonda. Remover os `Math.round` externos ou remover o `Math.round` de dentro de `toInt` e usá-lo explicitamente em todos os callers.

---

## O que está correto e bem feito

- **Tenancy:** todas as 10 queries passam `unitId` via `this.tenancy.resolveUnitId(user)` — contexto autenticado, nunca parâmetro do cliente. Nenhuma query retorna dados cross-unidade.
- **SQL Injection:** 100% das queries usam `$queryRaw` tagged template com parâmetros Prisma. Nenhum `Prisma.sql` manual, nenhuma concatenação. `categoria_id` validado como `@IsUUID()`, `ordem` como `@IsEnum`. `direction` ('DESC'|'ASC') resolvido via `if/else` com valores hardcoded — nunca interpolado do cliente.
- **Dinheiro:** sem `float` nas interfaces de retorno. Conversão via `Number(bigint)` + `Math.round()` nos callers é segura para valores monetários dentro do `Number.MAX_SAFE_INTEGER` (equivaleria a ~R$ 90 trilhões).
- **Divisão por zero:** `ticket_medio` protegido por `totalVendas > 0`. Margem protegida por `custo > 0 && precoMedio > 0` em JS e por `NULLIF(AVG(...), 0)` no SQL.
- **Camadas:** `RelatoriosService` usa exclusivamente `RelatoriosRepository` e `TenancyService` — sem `PrismaService` diretamente no service. Repository concentra todo o acesso ao banco.
- **RBAC:** `@Roles(SystemRole.ADMINISTRADOR)` presente nas 4 rotas. `JwtSystemGuard` e `RolesGuard` são globais via `APP_GUARD` no `app.module.ts`.
- **DTOs:** todos com `class-validator`. `@IsUUID`, `@IsISO8601`, `@IsEnum`, `@IsInt`, `@Min`/`@Max`, `@Type(() => Number)` presentes e corretos. `ValidationPipe` global com `whitelist: true`.
- **Período default e validação:** `resolvePeriodo` define `fim = now()` e `inicio = fim - 30d` quando omitidos, e lança `BadRequestException` se `inicio > fim`.
- **Saldo de estoque derivado:** `queryPosicaoEstoque` usa `SUM(sm.quantity)` sobre `stock_movements` — consistente com a convenção do módulo de estoque (entradas positivas, saídas negativas). Nenhum campo de saldo mutado diretamente.
- **Swagger:** `@ApiOperation` em todas as rotas, `@ApiBearerAuth` no controller, `@ApiTags` correto.
- **Módulo registrado:** `RelatoriosModule` importado em `app.module.ts`.

---

## Status geral

- 1 crítico (C1): lotes vencendo com estoque zerado aparecem no relatório — corrigir antes do merge.
- 2 avisos (A1, A2): margem divergente entre ranking e valor exibido; PII sem auditoria.
- 1 aviso arquitetural (A3): relatórios síncronos na requisição — planejar migração.
- 2 sugestões (S1, S2): simplificações de manutenção.
