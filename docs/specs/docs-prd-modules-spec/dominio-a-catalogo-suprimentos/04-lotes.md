# 4. Lotes

**Domínio:** Catálogo & Suprimentos
**Prioridade:** P0
**Path NestJS:** `apps/api/src/modules/lots/`

---

## Responsabilidade

Rastrear individualmente cada compra de um produto identificando-a por código de lote e data de validade, permitindo que o estoque distinga unidades do mesmo produto adquiridas em datas ou fornecimentos diferentes e aplique a baixa FIFO por validade.

## Entidades

### Lot

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK, gerado pelo banco |
| unidade_id | uuid | FK Unidade; escopo de tenancy |
| product_id | uuid | FK Product; obrigatório |
| invoice_item_id | uuid | FK PurchaseInvoiceItem; nullable (lote avulso) |
| code | varchar(100) | Código do lote; informado pelo fornecedor ou gerado internamente |
| expires_at | date | Data de validade; nullable (produtos sem validade) |
| manufactured_at | date | Data de fabricação; nullable |
| quantity_received | numeric(12,3) | Quantidade recebida na entrada; imutável após criação |
| tags | text[] | Tags opcionais para agrupamento ou filtragem (ex: "importado", "fragil") |
| active | boolean | Default `true`; inativo não entra no FIFO |
| notes | text | Observações do lote; nullable |
| created_at | timestamptz | Gerado pelo banco |
| updated_at | timestamptz | Atualizado automaticamente |

> **Nota:** o saldo atual do lote não é armazenado aqui. É derivado das `StockMovement` vinculadas a este `lot_id`. Ver módulo 5 — Estoque.

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| GET | /lots | Auth+RBAC | Listar lotes paginados; filtros: product_id, expires_before, expires_after, active, tags, code |
| GET | /lots/:id | Auth+RBAC | Buscar lote por ID com saldo calculado |
| POST | /lots | Auth+RBAC | Criar lote manualmente (fora do fluxo de NF) |
| PATCH | /lots/:id | Auth+RBAC | Atualizar metadados do lote (code, expires_at, tags, notes, active) |
| DELETE | /lots/:id | Auth+RBAC | Desativar lote (soft-delete); rejeitar se houver movimentações |
| GET | /lots/by-product/:productId | Auth+RBAC | Listar lotes de um produto com saldo e ordenação FIFO (validade asc, nulls last) |
| GET | /lots/expiring | Auth+RBAC | Lotes com validade nos próximos N dias (query param `days`, default 30) |

## Regras de Negócio

- Um lote pertence a um único produto (`product_id` é imutável após criação).
- O código do lote (`code`) não precisa ser único globalmente — pode-se ter o mesmo código de lote para produtos diferentes. A unicidade para controle interno é `(unidade_id, product_id, code)`.
- Lotes sem `expires_at` são tratados como "sem validade" e ficam no final da fila FIFO (consumidos por último).
- A ordenação FIFO: `expires_at ASC NULLS LAST`, com `created_at ASC` como desempate.
- Um lote não pode ser desativado se ainda houver saldo positivo (derivado de movimentações). Verificar antes de desativar.
- Lotes criados via Nota Fiscal (campo `invoice_item_id` preenchido) são considerados entradas formais; lotes criados manualmente são entradas avulsas (ajuste de inventário).
- A listagem `GET /lots/expiring` é usada pelo módulo de Notificações & Alertas para disparar alertas de vencimento próximo.
- Tags são um array livre de strings para categorização adicional (ex: "importado", "lote-piloto", "devolução").

## Invariantes Críticos

- **Nunca** armazenar saldo de lote na entidade `Lot` — saldo é sempre calculado via agregação das `StockMovement` com `lot_id`.
- `product_id` é imutável após criação do lote.
- `quantity_received` é imutável após criação — registra a entrada original para fins de auditoria.
- `unidade_id` sempre do contexto autenticado.

## Dependências

- **Upstream (usa):**
  - `Produtos` — cada lote pertence a um produto
  - `Notas Fiscais` — lotes criados na confirmação da NF (via `invoice_item_id`)
  - `Unidades` — escopo de tenancy
- **Downstream (usado por):**
  - `Estoque` — `StockMovement` referencia `lot_id`; saldo derivado de movimentações
  - `PDV` — seleciona lotes para baixa FIFO na venda
  - `Notificações & Alertas` — lotes com validade próxima

## Skills Relevantes

- `nestjs-erp-module` — estrutura padrão de módulo (sempre)
- `estoque-lote-fifo` — ordenação FIFO, saldo derivado de movimentações, regras de desativação

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após qualquer alteração
- `escritor-de-testes` — para testes de ordenação FIFO e cálculo de saldo

## Critérios de Aceite

- [ ] Lote criado via NF tem `invoice_item_id` preenchido; lote avulso tem `invoice_item_id` nulo
- [ ] `GET /lots/by-product/:productId` retorna lotes ordenados FIFO (expires_at ASC NULLS LAST)
- [ ] Saldo exibido no GET é calculado via agregação de movimentações, nunca campo estático
- [ ] Tentativa de desativar lote com saldo positivo retorna erro 409
- [ ] Unicidade `(unidade_id, product_id, code)` é enforçada; duplicata retorna erro 409
- [ ] `GET /lots/expiring?days=30` retorna apenas lotes com validade nos próximos 30 dias
- [ ] Listagem filtra por `unidade_id` do contexto autenticado
- [ ] Endpoints documentados no Swagger
