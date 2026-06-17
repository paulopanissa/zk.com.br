# Pre-PR Review — feat-30: Módulo Cupons

**Revisor:** revisor-erp (Claude Code)
**Data:** 2026-06-17
**Status geral:** AMARELO

---

## Crítico (precisa corrigir)

### C1 — Race condition em `incrementUses`: sem SELECT FOR UPDATE no Coupon

**Arquivo:** `apps/api/src/modules/cupons/cupons.repository.ts`, linhas 75–88

O `incrementUses` verifica `uses_count >= max_uses` sem travar a linha do cupom. Com dois checkouts simultâneos para um cupom com `max_uses = 1`:

1. TX-A lê `uses_count = 0` → dentro do limite
2. TX-B lê `uses_count = 0` → dentro do limite
3. TX-A cria `CouponUsage` (salva) e incrementa `uses_count` para 1
4. TX-B cria `CouponUsage` (violação de `@@unique` → exception engolida pelo `catch`) → retorna `{ success: false }` ← **OK neste caminho**

Na verdade, o `@@unique([coupon_id, venda_id])` no schema protege contra dupla inserção para a *mesma venda*, mas **não protege contra duas vendas diferentes**. Duas vendas diferentes em paralelo com `max_uses = 1` passam pela verificação lendo o mesmo `uses_count = 0` e ambas criam `CouponUsage` com `venda_id` distintos. Não há `UNIQUE` que bloqueie isso — o constraint é só por par `(coupon_id, venda_id)`.

**Correção:** trocar `findFirst` por `$queryRaw` com `SELECT ... FOR UPDATE` ou usar `UPDATE coupons SET uses_count = uses_count + 1 WHERE id = $1 AND (max_uses IS NULL OR uses_count < max_uses) RETURNING id` e checar se retornou linha.

```ts
// dentro de $transaction
const updated = await tx.$executeRaw`
  UPDATE coupons
  SET uses_count = uses_count + 1
  WHERE id = ${couponId}
    AND active = true
    AND (max_uses IS NULL OR uses_count < max_uses)
`;
if (updated === 0) throw new Error('limit_reached');
```

---

### C2 — TOCTOU em checkout: `validateForUnit` fora da transação não garante que o limite não estoure

**Arquivo:** `apps/api/src/modules/vendas/vendas.service.ts`, linhas 204–214 e 296–298

O fluxo é:
1. `validateForUnit(...)` — lê `uses_count` fora de qualquer transação (linha 208)
2. `$transaction(...)` — baixa estoque, cria pagamentos, finaliza venda (linha 232)
3. `applyCouponToSale(...)` — incrementa `uses_count` APÓS o commit da transação (linha 297)

O passo 3 está **fora** da transação de venda. Se a aplicação crashar após o commit da venda (passo 2) e antes do passo 3, a venda fica finalizada mas o `uses_count` não é incrementado, permitindo que o cupom seja usado mais vezes do que `max_uses`. Isso é agravado pelo C1 acima.

**Correção ideal:** mover o `applyCouponToSale` (ou ao menos o `incrementUses`) para *dentro* da transação de venda, usando o `tx` extendido. Alternativamente, aceitar o risco de "over-decrement" e compensar via reconciliação, mas isso deve ser decisão explícita documentada.

---

## Aviso (deveria corrigir)

### A1 — Erro silencioso em `incrementUses`: `catch` engole toda exception

**Arquivo:** `apps/api/src/modules/cupons/cupons.repository.ts`, linhas 91–93

O bloco `catch` captura qualquer erro (inclusive erros de banco inesperados, rede, timeout) e retorna `{ success: false }`. O `service.applyCouponToSale` então lança `UnprocessableEntityException` — o que causa um HTTP 422 para o cliente numa operação de venda **já finalizada e com estoque já baixado**. O cliente vê erro mas a venda foi criada.

**Correção:** distinguir `coupon_not_found` e `limit_reached` (controlados) de erros inesperados, re-throw nos inesperados para não mascarar falhas de infraestrutura.

---

### A2 — `validate` via endpoint público passa `cartTotal = 0` ao calcular percentual

**Arquivo:** `apps/api/src/modules/cupons/cupons.service.ts`, linha 151

```ts
return this.validateForUnit(dto.code, dto.product_ids ?? [], unitId, 0);
```

Para cupom `PERCENTUAL`, `discount_centavos` sempre será `0` na validação manual (endpoint `POST /cupons/validar`), porque `cartTotal = 0`. A resposta é tecnicamente válida mas confusa para o PDV: o operador vê desconto zero e pode pensar que o cupom não funciona. O DTO `ValidateCouponDto` deveria aceitar `cart_total_centavos` opcional para o cálculo informativo.

Isto não quebra a venda (o checkout usa o `total_liquido_centavos` real), mas a UX do endpoint de validação manual é enganosa.

---

### A3 — Guard de autenticação não está visível no controller

**Arquivo:** `apps/api/src/modules/cupons/cupons.controller.ts`

O controller usa `@Roles(...)` mas não há `@UseGuards(JwtAuthGuard, RolesGuard)` explícito nas rotas nem no nível de classe. Se o projeto depende de guards globais registrados no `AppModule`, isso é aceitável — mas precisa ser verificado. Se não houver guard global, todas as rotas de cupom estão desprotegidas. Confirme que `APP_GUARD` com `JwtAuthGuard` está registrado globalmente.

---

## Sugestão (bom ter)

### S1 — `percent_bps` permite 10000 (100%) — venda gratuita possível

**Arquivo:** `apps/api/src/modules/cupons/dto/create-coupon.dto.ts`, linha 35

`@Max(10000)` permite cupom de 100% de desconto. Dependendo da regra de negócio, isso pode ser intencional. Se não for, limite a `@Max(5000)` (50%) ou adicione validação no service para não permitir `discount_centavos > cart_total`.

### S2 — Ausência de `@IsMaxDate`/comparação entre `valid_from` e `valid_until` no DTO

**Arquivo:** `apps/api/src/modules/cupons/dto/create-coupon.dto.ts`

Não há validação cruzada entre `valid_from` e `valid_until`. É possível criar um cupom com `valid_until < valid_from`, que nunca será válido mas não causa erro explícito — só silenciosamente nunca funciona.

### S3 — `uses_count` como campo mutável cria acoplamento

O `uses_count` é um campo denormalizado que pode divergir da contagem real de `CouponUsage`. Ao cancelar uma venda, o `uses_count` não é decrementado. Pode-se tolerar a divergência, mas deve ser documentado explicitamente.

---

## O que está bem feito

- Tenancy correta em todos os métodos: `unitId` sempre vem de `TenancyService.resolveUnitId(user)`, nunca de parâmetro do cliente.
- Dinheiro correto: `value_centavos` e `percent_bps` são `Int` no schema; `@IsInt()` nos DTOs; cálculo percentual usa `Math.round((cartTotal * percent_bps) / 10000)` — inteiro puro, sem float.
- RBAC correto: `ADMINISTRADOR` nos mutadores (create/update/delete); `ADMINISTRADOR + OPERADOR_PDV` nas consultas e validação.
- Idempotência por `(coupon_id, venda_id)` via `@@unique` + `findUnique` antes de inserir — cobre o caso de retry da mesma venda.
- Camadas respeitadas: controller sem lógica, service com regras, repository com dados.
- Schema correto: `Coupon` tem `@@unique([unidade_id, code])`, campos `Int` para valores monetários e basis points.

---

## Resumo de ações necessárias antes do merge

| Prioridade | Item | Arquivo | Linha |
|---|---|---|---|
| CRÍTICO | Usar UPDATE atômico em `incrementUses` (sem SELECT prévio) | `cupons.repository.ts` | 75–88 |
| CRÍTICO | Mover `applyCouponToSale` para dentro da transação de venda | `vendas.service.ts` | 232–297 |
| AVISO | Distinguir erros controlados de erros inesperados no `catch` | `cupons.repository.ts` | 91–93 |
| AVISO | Aceitar `cart_total_centavos` no endpoint `POST /cupons/validar` | `cupons.service.ts` | 151 |
| AVISO | Confirmar guard global JWT+Roles ou adicionar explicitamente | `cupons.controller.ts` | — |
