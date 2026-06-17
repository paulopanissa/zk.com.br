# 11. PDV

**Domínio:** Vendas
**Prioridade:** P1
**Path NestJS:** `apps/api/src/modules/pdv/`

---

## Responsabilidade

Gerenciar o fluxo completo de venda no ponto de caixa (loja e feira), suportando operação online e offline-capable: registrar venda, baixar estoque por lote FIFO com idempotência, processar pagamento (dinheiro, PIX, cartão via maquininha Point ou modo autônomo) e emitir recibo.

---

## Entidades

### Sale (Venda)

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK; gerado no frontend (offline-capable); usado como chave de idempotência |
| unidade_id | uuid | FK → Unidade; escopo obrigatório |
| operador_id | uuid | FK → Usuário do sistema |
| cliente_id | uuid | FK → Cliente; nulo para venda anônima |
| status | enum | `ABERTA`, `AGUARDANDO_PAGAMENTO`, `PAGA`, `CANCELADA` |
| subtotal_centavos | integer | Soma dos itens sem desconto |
| desconto_total_centavos | integer | Desconto manual + desconto de cupom; >= 0 |
| total_centavos | integer | `subtotal - desconto_total`; > 0 após desconto |
| coupon_id | uuid | FK → Coupon; nulo se sem cupom |
| desconto_cupom_centavos | integer | Parcela do desconto referente ao cupom |
| desconto_manual_centavos | integer | Desconto manual aplicado pelo operador; >= 0 |
| canal | enum | `PDV_ONLINE` ou `PDV_OFFLINE` |
| origem_offline | boolean | true se venda foi criada sem conectividade |
| sincronizado_em | timestamptz | Quando a venda offline foi sincronizada; nulo para vendas online |
| created_at | timestamptz | Momento de criação (gerado no dispositivo para vendas offline) |
| updated_at | timestamptz | Gerenciado pelo ORM |

### SaleItem (Item da Venda)

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| sale_id | uuid | FK → Sale |
| produto_id | uuid | FK → Produto |
| lote_id | uuid | FK → Lote; preenchido na confirmação da baixa |
| quantidade | integer | > 0 |
| preco_unitario_centavos | integer | Preço no momento da venda (snapshot imutável) |
| desconto_item_centavos | integer | Desconto de cupom por produto aplicado a este item; >= 0 |
| total_item_centavos | integer | `(preco_unitario - desconto_item) * quantidade` |

### SalePayment (Pagamento da Venda)

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| sale_id | uuid | FK → Sale |
| metodo | enum | `DINHEIRO`, `PIX`, `CARTAO_CREDITO`, `CARTAO_DEBITO` |
| valor_centavos | integer | > 0 |
| status | enum | `PENDENTE`, `APROVADO`, `RECUSADO`, `EXPIRADO` |
| gateway_provider | varchar(50) | Ex: "mercado_pago_point"; nulo para dinheiro |
| gateway_transaction_id | varchar(255) | ID da transação no gateway; nulo para dinheiro/offline |
| modo | enum | `ONLINE` (envio automático à maquininha) ou `AUTONOMO` (operador digita na máquina) |
| reconciliado | boolean | Default false; true após confirmação do gateway |
| reconciliado_em | timestamptz | Momento da reconciliação |
| created_at | timestamptz | Gerenciado pelo ORM |

### SaleReceipt (Recibo)

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| sale_id | uuid | FK → Sale; único |
| numero_recibo | varchar(30) | Gerado sequencialmente por unidade |
| conteudo_json | jsonb | Snapshot dos dados do recibo no momento da emissão |
| emitido_em | timestamptz | Momento de emissão |

---

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| POST | `/pdv/sales` | JWT + RBAC (pdv, admin) | Cria/sincroniza uma venda (online ou offline); idempotente por `sale.id` |
| GET | `/pdv/sales` | JWT + RBAC (pdv, admin) | Lista vendas (paginado; filtros: status, data, operador, canal) |
| GET | `/pdv/sales/:id` | JWT + RBAC (pdv, admin) | Detalha venda com itens e pagamentos |
| PATCH | `/pdv/sales/:id/discount` | JWT + RBAC (pdv, admin) | Aplica/altera desconto manual no total da venda (apenas em status `ABERTA`) |
| POST | `/pdv/sales/:id/coupon` | JWT + RBAC (pdv, admin) | Aplica cupom à venda aberta |
| DELETE | `/pdv/sales/:id/coupon` | JWT + RBAC (pdv, admin) | Remove cupom da venda aberta |
| POST | `/pdv/sales/:id/checkout` | JWT + RBAC (pdv, admin) | Inicia o checkout: valida estoque, bloqueia lotes, cria SalePayment; responde com instrução ao gateway se online |
| POST | `/pdv/sales/:id/payment/confirm` | JWT + RBAC (pdv, admin) | Confirma pagamento manual (dinheiro ou modo autônomo); dispara baixa de estoque |
| POST | `/pdv/sales/:id/cancel` | JWT + RBAC (pdv, admin) | Cancela venda; estorno de estoque se já baixado |
| GET | `/pdv/sales/:id/receipt` | JWT + RBAC (pdv, admin) | Retorna recibo da venda paga |
| POST | `/pdv/sales/:id/receipt/send` | JWT + RBAC (pdv, admin) | Envia recibo por e-mail ou WhatsApp (via fila) |
| GET | `/pdv/sales/pending-reconciliation` | JWT + RBAC (admin) | Lista pagamentos modo `AUTONOMO` pendentes de reconciliação |
| PATCH | `/pdv/sales/:id/payment/:paymentId/reconcile` | JWT + RBAC (admin) | Marca pagamento autônomo como reconciliado |

### Webhook (interno)

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| POST | `/pdv/webhooks/point` | Assinatura HMAC | Recebe callback da API Point do Mercado Pago; confirma ou recusa pagamento |

---

## Regras de Negócio

### Criação e idempotência da venda

- O `id` da venda é gerado pelo cliente (UUID v4) antes de ser enviado à API. Isso permite que vendas offline usem o mesmo ID ao sincronizar.
- Se o endpoint `POST /pdv/sales` receber uma venda com `id` já existente, retorna HTTP 200 com os dados atuais sem reprocessar (idempotência).
- Vendas com `canal = PDV_OFFLINE` podem chegar com `created_at` no passado; o campo é preservado como enviado.

### Carrinho e desconto

- O desconto manual é limitado a uma porcentagem máxima configurável (default: sem limite, mas validada no DTO).
- `total_centavos` nunca pode ser <= 0 após desconto manual; o sistema rejeita descontos que zeram ou negativam o total.
- Cupom e desconto manual são cumulativos; a ordem de aplicação é: desconto de cupom primeiro, desconto manual depois.

### Checkout e baixa de estoque

- No checkout, o sistema verifica disponibilidade de estoque para cada item.
- A baixa efetiva de estoque ocorre **apenas** após confirmação do pagamento (status `PAGA`), nunca antes.
- A baixa usa `SELECT ... FOR UPDATE` nos lotes selecionados (FIFO por validade) para evitar overselling em vendas simultâneas.
- Se a venda tiver múltiplos lotes para um produto, a baixa distribui a quantidade entre os lotes em ordem FIFO.
- A idempotência da baixa é garantida pelo `sale.id`: se já existirem movimentações de estoque vinculadas à venda, a baixa não é reprocessada.

### Pagamento online (maquininha Point)

- Ao confirmar pagamento via cartão online, a API envia o valor à maquininha via API Point do Mercado Pago.
- O status fica `AGUARDANDO_PAGAMENTO` até receber o webhook de confirmação.
- O webhook valida a assinatura HMAC antes de processar; payloads sem assinatura válida são rejeitados com HTTP 401.
- O webhook é idempotente: se o `gateway_transaction_id` já estiver como `APROVADO`, retorna HTTP 200 sem reprocessar.

### Modo autônomo (offline/PIX/dinheiro)

- No modo autônomo, o operador cobra pelo meio externo e confirma via `POST /pdv/sales/:id/payment/confirm`.
- O sistema registra o método e marca `modo = AUTONOMO` e `reconciliado = false`.
- O admin reconcilia posteriormente via `PATCH /pdv/sales/:id/payment/:paymentId/reconcile`.

### Cancelamento

- Venda com status `ABERTA` ou `AGUARDANDO_PAGAMENTO` pode ser cancelada sem estorno.
- Venda com status `PAGA` exige estorno de estoque: as movimentações de baixa são revertidas (novas movimentações de entrada vinculadas à venda com tipo `CANCELAMENTO`).
- Venda cancelada não pode ser reaberta.

### Recibo

- Gerado automaticamente quando a venda atinge status `PAGA`.
- O `conteudo_json` é um snapshot imutável dos dados no momento da emissão (produto, preço, desconto, pagamento, operador, cliente).
- O número de recibo é sequencial por unidade, gerado com lock para evitar duplicata.

### Envio do recibo

- O envio por e-mail ou WhatsApp é assíncrono via RabbitMQ — nunca bloqueia a resposta do endpoint.

---

## Invariantes Críticos

- **Idempotência da venda:** um `sale.id` duplicado nunca gera duas vendas ou duas baixas de estoque.
- **Idempotência do pagamento:** um `gateway_transaction_id` confirmado não é reprocessado no webhook.
- **Baixa de estoque somente após pagamento confirmado:** nunca baixar estoque antes de status `PAGA`.
- **SELECT ... FOR UPDATE nos lotes:** toda baixa de estoque ocorre dentro de uma transação com lock do lote para evitar overselling.
- **Nunca float:** todos os valores monetários são inteiros em centavos.
- **Assinatura HMAC obrigatória no webhook:** nenhum callback sem assinatura válida altera o estado da venda.
- **total_centavos > 0:** o sistema nunca permite finalizar uma venda com total zero ou negativo.
- **Snapshot de preço imutável:** `preco_unitario_centavos` em `SaleItem` é persistido no momento da venda e não muda se o preço do produto for alterado depois.

---

## Dependências

- **Upstream (usa):**
  - `Estoque` (módulo 5) — verifica disponibilidade e registra movimentações (baixa FIFO)
  - `Lotes` (módulo 4) — seleciona lotes para baixa FIFO
  - `Produtos` (módulo 7) — lê preço atual no momento da venda
  - `Clientes` (módulo 12) — vincula cliente à venda (opcional)
  - `Cupons` (módulo 10) — aplica cupons no carrinho
  - `Configuração de Pagamentos` (módulo 16) — obtém gateway e provider por método
  - `Unidades / Lojas` (módulo 15) — escopo de `unidade_id`
  - `Autenticação & Autorização` (módulo 23) — JWT e RBAC

- **Downstream (usado por):**
  - `Relatórios` (módulo 21) — dados de vendas
  - `Notificações & Alertas` (módulo 20) — alerta de estoque baixo pós-venda
  - `Worker` — recebe eventos de envio de recibo e sync offline via RabbitMQ

---

## Skills Relevantes

- `nestjs-erp-module` — estrutura padrão (sempre)
- `estoque-lote-fifo` — baixa FIFO com `SELECT ... FOR UPDATE`, idempotência
- `pagamentos` — API Point, modo autônomo, webhook HMAC, reconciliação

---

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após alterações (módulo crítico: revisar invariantes de estoque e pagamento)
- `escritor-de-testes` — obrigatório: baixa de estoque, idempotência, webhook, cancelamento com estorno
- `auditor-seguranca-lgpd` — antes de release (dados de cliente, pagamento, webhook)

---

## Critérios de Aceite

- [ ] Dado `POST /pdv/sales` com `id` já existente, o sistema retorna HTTP 200 com os dados atuais sem reprocessar.
- [ ] Dado um checkout com dois produtos que compartilham estoque no mesmo lote, a baixa usa `SELECT ... FOR UPDATE` e venda concorrente aguarda ou falha corretamente.
- [ ] Dado pagamento confirmado, a movimentação de estoque `SAIDA` é criada exatamente uma vez, mesmo se o endpoint de confirmação for chamado duas vezes.
- [ ] Dado webhook do Point com assinatura HMAC inválida, retorna HTTP 401 sem alterar o estado da venda.
- [ ] Dado webhook duplicado com mesmo `gateway_transaction_id` já `APROVADO`, retorna HTTP 200 sem reprocessar.
- [ ] Dado desconto manual que zeraria o total, o sistema retorna HTTP 422.
- [ ] Dado cancelamento de venda `PAGA`, movimentações de estoque de estorno são criadas e o saldo do lote é restaurado.
- [ ] O snapshot `preco_unitario_centavos` no `SaleItem` não é alterado quando o preço do produto é atualizado após a venda.
- [ ] Todos os valores monetários na resposta são inteiros; nenhum float.
- [ ] Recibo emitido contém snapshot completo: itens, preços, descontos, método de pagamento, operador, cliente (quando presente).
- [ ] Envio de recibo por e-mail enfileira mensagem no RabbitMQ e retorna HTTP 202 sem bloquear.
- [ ] Todos os endpoints documentados no Swagger.
