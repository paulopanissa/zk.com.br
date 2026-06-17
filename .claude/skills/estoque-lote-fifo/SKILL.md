---
name: estoque-lote-fifo
description: Regras de estoque por lote, baixa FIFO por validade e concorrência segura neste ERP. Use SEMPRE que o trabalho tocar em estoque, lotes, validade, movimentação, entrada de mercadoria, ou baixa de estoque em venda (PDV ou e-commerce) — inclusive pedidos casuais como "dá baixa no estoque quando vender" ou "controla a validade dos lotes". É a parte mais arriscada do sistema, pois erro aqui causa venda a mais (overselling) e estoque divergente.
---

# Estoque por lote + FIFO + concorrência

## Modelo de dados (princípio inviolável)

- O estoque é rastreado **por produto E por lote**. Cada lote tem código e validade.
- **Saldo é derivado, nunca um campo mutável.** Toda entrada e saída é uma linha em `stock_movement` (tipo: ENTRADA/SAIDA/AJUSTE, quantidade, lote, origem, referência). O saldo de um lote é a soma das movimentações dele.
- Nunca faça `UPDATE produto SET saldo = saldo - 1`. Isso destrói rastreabilidade e abre brecha de corrida.

## Baixa FIFO por validade

Ao vender, consuma primeiro o lote de **validade mais próxima** (com saldo positivo). Se um lote não cobre a quantidade, continue no próximo. Permita **override manual no PDV** (operador escolhe o lote), mas o padrão é automático.

## Concorrência (o ponto crítico)

Duas vendas simultâneas da última unidade de um lote podem vender a mais. Para impedir:

- Faça a baixa **dentro de uma transação**.
- Trave as linhas dos lotes candidatos com `SELECT ... FOR UPDATE` (lock pessimista) antes de calcular e gravar a saída. Assim a segunda transação espera a primeira terminar e enxerga o saldo já reduzido.
- Alternativa: `UPDATE ... WHERE saldo >= :qtd` atômico e checar linhas afetadas (lock otimista). Use o que for mais simples no caso.

### Esqueleto de referência

```ts
await db.transaction(async (tx) => {
  // 1. lock dos lotes do produto, ordenados por validade (FIFO)
  const lotes = await tx.query(
    `SELECT id, saldo FROM lote
       WHERE produto_id = $1 AND saldo > 0
       ORDER BY validade ASC
       FOR UPDATE`, [produtoId]);

  // 2. consumir FIFO até cobrir a quantidade
  let restante = quantidade;
  for (const lote of lotes) {
    if (restante <= 0) break;
    const usar = Math.min(restante, lote.saldo);
    await tx.insert('stock_movement', {
      tipo: 'SAIDA', lote_id: lote.id, quantidade: usar,
      origem: 'VENDA', referencia: vendaId,
    });
    restante -= usar;
  }
  if (restante > 0) throw new ConflictException('Estoque insuficiente');
});
```

## Idempotência

A baixa é identificada pela venda (`referencia = vendaId`). Antes de baixar, verifique se já existe movimentação de SAIDA para aquela venda; se existir, não baixe de novo. Isso protege contra retry de rede e reprocessamento de fila.

## Reserva vs. confirmação (e-commerce)

No e-commerce, reserve o estoque no checkout (movimentação de RESERVA com expiração) e confirme na aprovação do pagamento. No PDV presencial a baixa é imediata na finalização.

## Sincronização do PDV offline

Venda feita offline gera movimentações locais que entram na fila ao reconectar. Ao processar, aplique a mesma regra de idempotência (por id da venda) para não duplicar a baixa.

## Checklist

- [ ] Saldo sempre derivado de movimentações; nenhum campo de saldo mutado direto.
- [ ] Baixa em transação com lock dos lotes.
- [ ] FIFO por validade, com override manual no PDV.
- [ ] Idempotência por id da venda.
- [ ] Estoque insuficiente lança erro claro, sem baixa parcial inconsistente.

## Agentes relacionados

- `escritor-de-testes` cobre overselling concorrente, idempotência e FIFO.
- `revisor-erp` verifica o lock e a idempotência da baixa.
