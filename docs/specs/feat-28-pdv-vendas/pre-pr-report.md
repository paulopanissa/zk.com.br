# Revisão Pre-PR — feat-28-pdv-vendas

**Data:** 2026-06-17
**Revisor:** revisor-erp (Claude Code)
**Status geral:** AMARELO (1 crítico, 3 avisos, 3 sugestões)

---

## Crítico (precisa corrigir)

### C1 — TOCTOU no checkout: itens carregados FORA da transação, lock ocorre em cima de snapshot antigo

**Arquivo:** `apps/api/src/modules/vendas/vendas.service.ts` linhas 193–268

O método `checkout` executa `findById` antes de abrir a `$transaction`. Os `venda.items` usados dentro da transação (linha 225, `for (const item of venda.items)`) são os lotes do snapshot pré-transação. Se outro request concorrente adicionou, removeu ou alterou um item entre o `findById` e o início da transação, o checkout operará com dados stale:

```ts
// fora da transação:
const venda = await this.repository.findById(id, unitId);   // snapshot antigo
...
await this.prisma.$transaction(async (tx) => {
  // re-check de STATUS correto, mas os ITENS ainda vêm do snapshot externo
  for (const item of venda.items) {                        // TOCTOU nos itens
    await this.stockRepository.reserveFifoInTx(tx, ...);
  }
});
```

O re-check de status (`findFirst` para `ABERTA`) é necessário e está correto, mas não relê os itens dentro da transação. Em ambiente PDV com múltiplos terminais, isso pode causar baixa de estoque para itens que já foram removidos ou quantidade divergente.

**Correção mínima:** fazer um `tx.vendaItem.findMany({ where: { venda_id: id } })` dentro do `$transaction` antes do loop de reserva, usando o cliente `tx`.

---

## Aviso (deveria corrigir)

### A1 — `addItem`: `unitId` passado mas não usado no `prisma.vendaItem.create` direto

**Arquivo:** `apps/api/src/modules/vendas/vendas.repository.ts` linhas 85–91

O método `addItem` recebe `_unitId` (underscore indica ignorado) e delega direto a `prisma.vendaItem.create({ data })`, sem nenhuma verificação de que o `venda_id` pertence à unidade. A proteção existe no chamador (`vendas.service.ts` linha 92–93, que verifica `unidade_id` no `findById`), mas caso o método seja chamado por outra rota no futuro sem esse check prévio, permite inserção de item em venda de outra unidade. O `_unitId` deveria ou ser removido da assinatura (e a garantia documentada) ou ser usado num `venda: { unidade_id: _unitId }` na cláusula where do create (via `connect`).

### A2 — Sync offline: `cliente_id` aceito sem validação de tenancy

**Arquivo:** `apps/api/src/modules/vendas/vendas.service.ts` linhas 449–528 (`_createOfflineSale`)

No fluxo de sync offline, o `dto.cliente_id` é inserido diretamente sem verificar `WHERE unidade_id = unitId`:

```ts
...(dto.cliente_id ? { cliente_id: dto.cliente_id } : {}),
```

No fluxo normal (`create`), há verificação explícita (linhas 44–49). No `_createOfflineSale` essa verificação foi omitida. Um PDV offline malicioso/comprometido pode associar a venda a um cliente de outra unidade, vazando o relacionamento entre vendas e clientes cross-tenant.

**Correção:** adicionar `await tx.customer.findFirst({ where: { id: dto.cliente_id, unidade_id: unitId } })` dentro da transação antes de inserir.

### A3 — `reserveFifoInTx`: `parseFloat` ao ler saldo de `Decimal` perde precisão para quantidades fracionadas altas

**Arquivo:** `apps/api/src/modules/stock/stock.repository.ts` linhas 228–232 (no diff, early-return de idempotência)

```ts
quantity: Math.abs(parseFloat(m.quantity.toString())),
```

`parseFloat` sobre um `Decimal` serializado funciona para a maioria dos casos, mas pode perder dígitos significativos em quantidades com muitas casas decimais (ex: `9999999.999`). O correto é usar `new Prisma.Decimal(m.quantity.toString()).toNumber()` ou manter como `Decimal` até o ponto de uso. Para este domínio (varejo pet, quantidades de até 3 casas decimais) o risco prático é baixo, mas viola a convenção de precisão fixa.

---

## Sugestão (bom ter)

### S1 — `numero` da venda usa SEQUENCE global, não por unidade

**Arquivo:** `apps/api/prisma/migrations/20260617160000_vendas/migration.sql` linha 7

```sql
CREATE SEQUENCE IF NOT EXISTS vendas_numero_seq;
```

A sequence é global. Uma loja com múltiplas unidades terá números de venda não sequenciais por unidade (ex: unidade A: 1, 3, 5; unidade B: 2, 4, 6). Isso pode confundir operadores e dificultar conciliação fiscal. Considerar sequence por `unidade_id` ou geração no application layer.

### S2 — Checkout não verifica idempotência de re-execução completa

Se o cliente chamar `POST /vendas/:id/checkout` duas vezes quase simultaneamente, o re-check de status (`findFirst WHERE status = ABERTA`) dentro da tx protege contra double-finalização. Porém, se a primeira chamada terminou com sucesso e o cliente não recebeu a resposta (timeout de rede), a segunda chamada retornará 422 ("não ABERTA") sem retornar a venda finalizada. O cliente não sabe se deve criar nova venda ou se a anterior foi finalizada. Recomenda-se retornar a venda finalizada mesmo neste caso (verificar se já está FINALIZADA e retornar sem erro).

### S3 — `VendaFull` expõe `telefone_principal` do cliente em todo `findById`

**Arquivo:** `apps/api/src/modules/vendas/vendas.repository.ts` linha 10

O campo `telefone_principal` é PII e é retornado em toda consulta de detalhe de venda, inclusive para `OPERADOR_PDV`. Avaliar se o operador precisa desse campo no contexto de detalhe de venda ou se deve ser omitido do select, seguindo o princípio de exposição mínima da skill `seguranca-lgpd`.

---

## O que está correto e bem feito

- **Dinheiro:** todos os campos monetários são `Int` (centavos) no schema e DTOs. Nenhum `float`. `@IsInt()` com `@Min(0)` nos DTOs. Correto.
- **Tenancy:** `unidade_id` sempre derivado de `TenancyService.resolveUnitId(user)` em todos os métodos do service. Nenhum parâmetro de rota/body é aceito para escolher a unidade. Correto.
- **RBAC:** `@Roles(...)` em todas as rotas. `@ApiBearerAuth()` no controller. Nenhuma rota pública. `reconcilePayment` corretamente restrito a `ADMINISTRADOR`. Correto.
- **FIFO + transação:** `reserveFifoInTx` usa `SELECT ... FOR UPDATE` nos lotes, calcula saldo pós-lock, aloca FIFO e insere `StockMovement` — tudo dentro do `$transaction` do checkout. Correto.
- **Idempotência de estoque:** chave `sale-${vendaId}-item-${itemId}` por item — única e determinística. Correto.
- **Cancelamento:** upsert com `idempotency_key: sale-cancel-${mv.id}` garante que re-execução não duplica SALE_RETURN. Correto.
- **Sync offline:** dedup por `sync_id` + `unidade_id` antes de processar. `sync_id` com `@unique` no banco. Correto.
- **`reserveFifo` (método original):** preservado e delega para `reserveFifoInTx` via `$transaction`. Sem quebra de contrato. Correto.
- **Camadas:** controller sem regra de negócio; service com toda a lógica; repository concentra acesso a dados. Correto.

---

## Resumo de ações necessárias antes do merge

| Prioridade | Item | Arquivo | Linha |
|---|---|---|---|
| CRÍTICO | Reler itens dentro da `$transaction` no checkout | `vendas.service.ts` | 225 |
| AVISO | Validar `cliente_id` com `unidade_id` no sync offline | `vendas.service.ts` | 478 |
| AVISO | Usar ou remover `_unitId` em `addItem` do repository | `vendas.repository.ts` | 87 |
| AVISO | Substituir `parseFloat` por `Decimal` no early-return de idempotência | `stock.repository.ts` | 228 |
