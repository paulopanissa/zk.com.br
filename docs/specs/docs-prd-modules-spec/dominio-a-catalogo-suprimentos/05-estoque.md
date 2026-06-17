# 5. Estoque

**Domínio:** Catálogo & Suprimentos
**Prioridade:** P0
**Path NestJS:** `apps/api/src/modules/stock/`

---

## Responsabilidade

Manter a rastreabilidade completa do estoque por produto e por lote através de uma tabela de movimentações imutável — toda entrada, saída ou ajuste gera um registro. Saldo é sempre derivado; nunca existe campo de saldo mutável. Garante baixa FIFO por validade com lock transacional para evitar overselling.

## Entidades

### StockMovement (imutável após inserção)

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK, gerado pelo banco |
| unidade_id | uuid | FK Unidade; escopo de tenancy |
| product_id | uuid | FK Product; obrigatório |
| lot_id | uuid | FK Lot; obrigatório |
| type | enum | Ver tipos abaixo |
| quantity | numeric(12,3) | Positivo para entradas, negativo para saídas/ajustes de redução |
| reference_id | uuid | Nullable; ID da entidade de origem (venda, nota fiscal, ajuste) |
| reference_type | varchar(50) | Nullable; tipo da entidade de origem: `PURCHASE_INVOICE`, `SALE`, `MANUAL_ADJUSTMENT`, `RETURN`, `LOSS` |
| idempotency_key | varchar(255) | Unique; previne movimentações duplicadas; ex: `sale_{sale_id}_lot_{lot_id}` |
| notes | text | Nullable; motivo do ajuste manual ou observações |
| created_by | uuid | FK usuário do sistema que gerou a movimentação |
| created_at | timestamptz | Gerado pelo banco; imutável |

**Tipos de movimentação (enum StockMovementType):**

| Valor | Direção | Origem |
|-------|---------|--------|
| `PURCHASE_ENTRY` | + | Confirmação de Nota Fiscal |
| `PURCHASE_CANCEL` | - | Cancelamento de Nota Fiscal confirmada |
| `SALE_OUT` | - | Venda no PDV ou e-commerce |
| `SALE_RETURN` | + | Devolução de venda |
| `MANUAL_ENTRY` | + | Ajuste manual de inventário (entrada) |
| `MANUAL_EXIT` | - | Ajuste manual de inventário (saída/perda) |
| `TRANSFER_OUT` | - | Transferência entre unidades (fase futura) |
| `TRANSFER_IN` | + | Transferência entre unidades (fase futura) |

> `StockMovement` é **append-only**: nunca atualizar ou excluir um registro. Correções geram nova movimentação de estorno.

### StockBalance (view materializada ou query — não tabela)

O saldo não é uma tabela. É calculado como:

```sql
SELECT
  product_id,
  lot_id,
  unidade_id,
  SUM(quantity) AS balance
FROM stock_movement
WHERE unidade_id = $1
GROUP BY product_id, lot_id, unidade_id
```

Para performance, pode-se criar uma **view materializada** atualizada após cada movimentação, ou usar a query diretamente com índice em `(unidade_id, product_id, lot_id)`.

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| GET | /stock | Auth+RBAC | Saldo atual por produto; filtros: product_id, category_id, low_stock (abaixo do mínimo) |
| GET | /stock/product/:productId | Auth+RBAC | Saldo do produto por lote (com detalhes de validade) |
| GET | /stock/lot/:lotId | Auth+RBAC | Saldo e histórico de movimentações de um lote |
| GET | /stock/movements | Auth+RBAC | Listar movimentações paginadas; filtros: product_id, lot_id, type, date_from, date_to |
| POST | /stock/movements | Auth+RBAC | Criar movimentação manual (MANUAL_ENTRY ou MANUAL_EXIT) |
| POST | /stock/reserve | Auth+RBAC (interno) | Reservar quantidade FIFO para uma venda (retorna lista de lotes e quantidades) |

> `POST /stock/reserve` é um endpoint interno chamado pelo módulo de PDV/vendas durante o checkout. Não é para uso direto pelo operador.

## Regras de Negócio

### Saldo derivado (invariante absoluto)
- Saldo é **sempre** `SUM(quantity)` das movimentações de um `(unidade_id, product_id, lot_id)`. Nunca existe coluna de saldo no banco que seja atualizada diretamente.

### Baixa FIFO
- Ao registrar uma saída de estoque para uma venda (`SALE_OUT`), o sistema seleciona os lotes FIFO:
  1. Filtrar lotes ativos (`active = true`) do produto com saldo > 0.
  2. Ordenar por `expires_at ASC NULLS LAST`, desempate por `created_at ASC`.
  3. Consumir do primeiro lote até esgotar; passar para o próximo se necessário.
  4. Retornar a lista de `(lot_id, quantity)` a ser baixada.

### Lock transacional (anti-overselling)
- A seleção e a baixa de lotes são executadas dentro de uma transação com `SELECT ... FOR UPDATE` nos lotes selecionados.
- Sequência dentro da transação:
  1. `SELECT id, ... FROM lot WHERE id = ANY($loteIds) FOR UPDATE`
  2. Verificar saldo de cada lote (via `SUM(quantity)` das movimentações).
  3. Inserir as `StockMovement` de saída.
  4. Commit.
- Concorrência: se dois processos tentarem baixar do mesmo lote simultaneamente, o segundo aguarda o lock do primeiro ser liberado.

### Idempotência
- Toda movimentação de saída de venda carrega um `idempotency_key` no formato `sale_{sale_id}_lot_{lot_id}`.
- Se a key já existir, a movimentação é ignorada silenciosamente (retornar o registro existente).
- Previne baixas duplicadas em retries de rede.

### Ajustes manuais
- Ajustes manuais (`MANUAL_ENTRY`, `MANUAL_EXIT`) requerem campo `notes` obrigatório (motivo).
- Ajustes manuais exigem papel RBAC elevado (ex: `STOCK_ADMIN`).
- Ajuste de saída que resulte em saldo negativo deve ser explicitamente permitido pelo RBAC (`ALLOW_NEGATIVE_STOCK`); caso contrário, retornar erro 422.

### Alerta de estoque mínimo
- Cada produto pode ter um `min_stock` configurado. Após qualquer movimentação, se o saldo total do produto (soma de todos os lotes) cair abaixo de `min_stock`, publicar evento na fila RabbitMQ para o módulo de Notificações disparar o alerta.

## Invariantes Críticos

- **Nunca mutar um campo de saldo.** Saldo é sempre `SUM(quantity)` das movimentações.
- **Nunca deletar ou alterar um `StockMovement`.** É append-only. Correções = nova movimentação de estorno.
- **`SELECT ... FOR UPDATE` obrigatório** em toda baixa de estoque para prevenir overselling.
- **Idempotência por `idempotency_key`** em toda saída de venda. Retry seguro.
- `unidade_id` sempre do contexto autenticado.
- Quantidade em movimentações: positiva = entrada, negativa = saída. Nunca usar campo de direção separado.

## Dependências

- **Upstream (usa):**
  - `Lotes` — movimentações referenciam `lot_id`
  - `Produtos` — movimentações referenciam `product_id`
  - `Unidades` — escopo de tenancy
  - `Notas Fiscais` — gera movimentações `PURCHASE_ENTRY` / `PURCHASE_CANCEL`
- **Downstream (usado por):**
  - `PDV / Vendas` — consome `POST /stock/reserve` para baixa FIFO
  - `Notificações & Alertas` — recebe evento de estoque mínimo
  - `Relatórios` — histórico e saldo para relatórios de estoque

## Skills Relevantes

- `nestjs-erp-module` — estrutura padrão de módulo (sempre)
- `estoque-lote-fifo` — **mandatória**: FIFO por validade, `SELECT ... FOR UPDATE`, idempotência, append-only, saldo derivado

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após qualquer alteração
- `escritor-de-testes` — **prioritário**: testes de concorrência, FIFO, idempotência e rollback

## Critérios de Aceite

- [ ] Saldo de qualquer produto/lote é calculado por `SUM(quantity)` — não existe coluna de saldo no banco
- [ ] Não existe endpoint ou serviço que atualize diretamente um campo de saldo
- [ ] Venda com múltiplos lotes disponíveis consome primeiro o de validade mais próxima (FIFO)
- [ ] Lotes sem validade são consumidos por último (NULLS LAST)
- [ ] Duas vendas simultâneas do mesmo lote não resultam em saldo negativo (lock transacional)
- [ ] Retry de uma saída com a mesma `idempotency_key` retorna o registro existente sem criar duplicata
- [ ] Ajuste manual de saída exige campo `notes` preenchido
- [ ] Movimentação criada nunca é alterada ou excluída (append-only verificável via log de auditoria)
- [ ] Saldo abaixo de `min_stock` publica evento na fila para Notificações
- [ ] Listagem de movimentações filtra por `unidade_id` do contexto autenticado
- [ ] Endpoints documentados no Swagger
