# Pre-PR Review Report — Módulo 7: Produtos

**Status: AMARELO (bloqueio médio + avisos)**

---

## CRITICO — Precisa corrigir antes do merge

### C1 · Repository `update` e `deactivate` sem `unidade_id` no `where` (Tenancy)

**Arquivo:** `apps/api/src/modules/products/products.repository.ts`, linhas 101–113

```ts
// update — line 101
update(id: string, data: Prisma.ProductUpdateInput) {
  return this.prisma.product.update({
    where: { id },   // ← sem unidade_id
    data,
    ...
  });
}

// deactivate — line 108
deactivate(id: string) {
  return this.prisma.product.update({
    where: { id },   // ← sem unidade_id
    data: { active: false },
  });
}
```

**Risco:** Mesmo que o service chame `findById(id, unitId)` antes, existe uma janela de TOCTOU: um produto de outra unidade com o mesmo UUID poderia ser mutado se o guard de tenancy falhar ou se o método for reutilizado sem o check prévio. A convenção do projeto (invariante de tenancy) exige que **todo** `update`/`delete` no repositório inclua `unidade_id` no `where` — não apenas o `find`. Corrija adicionando `unitId` como parâmetro e inclua no `where`.

Também afeta: `updatePricing`, `updateDelivery`, `updateFiscal`, `updateSeo` — todos usam `where: { product_id: productId }` sem `unidade_id`. Isso é menos grave porque `product_id` é UUID único global, mas viola a convenção de defesa em profundidade.

---

### C2 · `countLoteLinks` sempre retorna 0 — guarda de soft-delete está desativada

**Arquivo:** `apps/api/src/modules/products/products.repository.ts`, linhas 174–179

```ts
countLoteLinks(id: string): Promise<number> {
  // TODO: implement when Lotes module (4) exists ...
  void id;
  return Promise.resolve(0);  // ← proteção nunca dispara
}
```

**Risco:** `service.deactivate` checa `loteLinks > 0` antes de desativar, mas o método stub nunca retorna > 0. A lógica de proteção **parece** correta mas é ineficaz. Quando o módulo 4 existir, o desenvolvedor pode não lembrar de voltar aqui. Isso não é um "aviso futuro" — é um contrato quebrado hoje: o endpoint `DELETE /products/:id` promete no Swagger "Falha com 409 se o produto possuir lotes vinculados" mas nunca falha.

**Ação imediata:** Ou remove a promessa do Swagger e do service até o módulo 4 estar pronto, ou documenta de forma explícita que o guard está desativado (e rastreia via issue).

---

## AVISO — Deveria corrigir

### A1 · `simulatePricing` retorna `margin_pct` como `float` JavaScript

**Arquivo:** `apps/api/src/modules/products/products.service.ts`, linha 205

```ts
margin_pct: parseFloat(margin_pct.toFixed(4)),
```

No `updatePricing` (linha 192) a margem é corretamente armazenada como `new Prisma.Decimal(margin_pct.toFixed(4))`. Mas no `simulatePricing` o retorno usa `parseFloat`, que é um `number` JavaScript (IEEE 754 float). Embora não persista, a resposta da API expõe um float para o cliente, inconsistente com o invariante de "nunca float para dinheiro/percentual" e pode causar diferença nos cálculos frontend vs backend.

**Correção:** Retorne como string com precisão fixa: `margin_pct: Number(margin_pct.toFixed(4))` já é melhor, mas o ideal é retornar como string `"xx.xxxx"` ou documento no Swagger que é Decimal(8,4).

---

### A2 · `UpdateProductPricingDto.max_discount_pct` decorado como `@IsNumber()` sem `@IsDecimal` — risco de float no input

**Arquivo:** `apps/api/src/modules/products/dto/update-product-pricing.dto.ts`, linha 39

`max_discount_pct?: number` recebe `@IsNumber()`, o que aceita `12.3456789...` (float). No schema Prisma está como `Decimal(5,2)`. Não há validação de casas decimais no DTO: um cliente que envie `12.123456` terá o valor silenciosamente truncado pelo Prisma.

**Correção:** Adicione `@IsDecimal({ decimal_digits: '0,2' })` ou `@Max`/`@Min` com `@IsNumber({ maxDecimalPlaces: 2 })`.

Mesmo problema nas alíquotas fiscais em `UpdateProductFiscalDto` (linhas 79–105): `aliquota_icms`, `aliquota_pis`, etc. são `@IsNumber()` sem restrição de casas decimais.

---

### A3 · Rota `POST :id/pricing/simulate` aparece ANTES de `PATCH :id/pricing` no controller — OK

**Confirmado correto** — linha 84 antes da linha 97. Sem problema aqui.

---

### A4 · Rota `PATCH :id/media/reorder` aparece DEPOIS de `POST :id/media` — risco de conflito em Express/Fastify

**Arquivo:** `apps/api/src/modules/products/products.controller.ts`, linhas 162–185

`POST :id/media` (linha 162) antes de `PATCH :id/media/reorder` (linha 177). São verbos diferentes então não há ambiguidade de routing no caso atual. Porém a convenção do projeto (e o checklist passado) exige static routes antes de param routes. Reordenar para colocar `PATCH :id/media/reorder` antes de `POST :id/media` elimina qualquer dúvida futura, especialmente se o método do `addMedia` mudar para PATCH.

---

### A5 · `ProductsModule` não importa `TenancyModule`

**Arquivo:** `apps/api/src/modules/products/products.module.ts`

`TenancyService` é injetado em `ProductsService` mas `TenancyModule` não está nos `imports` do módulo. Funciona agora porque `TenancyModule` é `@Global()` (confirmado), mas se o escopo global for removido no futuro o módulo quebra silenciosamente. **Boa prática:** declare a dependência explicitamente com `imports: [TenancyModule]`.

---

## SUGESTAO — Bom ter

### S1 · `@@unique([unidade_id, sku])` com `sku` nullable pode gerar colisão inesperada

**Arquivo:** `apps/api/prisma/schema.prisma`, linha 282

No PostgreSQL, `UNIQUE` em coluna nullable trata cada `NULL` como distinto, então múltiplos produtos com `sku = NULL` são permitidos — correto. Porém o `findBySku` no repository usa `findFirst` (não `findUnique`) o que é consistente. Nenhum bug, mas vale comentar no schema para futuros devs.

### S2 · Slug collision loop em `update` pode ser infinito em edge case extremo

**Arquivo:** `apps/api/src/modules/products/products.service.ts`, linhas 138–144

O loop `while(true)` incrementa `suffix` mas não tem limite de iterações. Em produção com milhares de produtos com nomes similares o loop pode demorar. Adicione um limite (ex: 99) e lance erro amigável.

### S3 · `addMedia` em `service` não é acessível via controller — dead code

**Arquivo:** `apps/api/src/modules/products/products.service.ts`, linhas 245–265

O método `addMedia` no service tem lógica completa (calcula `maxOrder`, etc.) mas o controller stub em `POST :id/media` (linha 162) **nunca o chama** — retorna mensagem fixa sem invocar o service. O código de `addMedia` no service ficará órfão até o módulo 25 (Storage) ser implementado. Não é bug, mas é confuso. Considere mover essa lógica para um TODO comment ou criar um issue rastreável.

---

## Resumo dos invariantes verificados

| Invariante | Status |
|---|---|
| Tenancy — `findAll`, `findById`, `findBySku`, `findBySlug`, `findByBarcode` | OK |
| Tenancy — `update`, `deactivate` (repository) | **FALHA — C1** |
| Monetary — schema usa `Int` para cents e `Decimal` para pct | OK |
| Monetary — `float` em `simulatePricing` response | Aviso — A1 |
| Margin recalc em `updatePricing` | OK |
| Simulate no-persist | OK |
| SEO generate retorna 202 | OK |
| CST/CSOSN mutual exclusion | OK |
| Soft-delete guard (`countLoteLinks`) | **STUB INATIVO — C2** |
| RBAC `@Roles(SystemRole.ADMINISTRADOR)` na classe | OK |
| Nenhuma rota `@Public()` | OK |
| Route ordering `simulate` before `updatePricing` | OK |
| Route ordering media static before param | Aviso menor — A4 |
| Controller sem regra de negócio | OK |
| Service sem HTTP | OK |
| Repository concentra dados | OK |
| Swagger documentado em todos endpoints | OK |
| SEO generation não bloqueia (fila) | OK (TODO comentado) |
