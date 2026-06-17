# 3. Notas Fiscais de Entrada

**Domínio:** Catálogo & Suprimentos
**Prioridade:** P0
**Path NestJS:** `apps/api/src/modules/purchase-invoices/`

---

## Responsabilidade

Registrar entradas de mercadoria por dois caminhos — cadastro manual ou upload de XML de NFe — vinculando o fornecedor pelo CNPJ, aplicando marcas aos itens, cadastrando/vinculando produtos e gerando lotes, com armazenamento do XML e PDF no storage.

## Entidades

### PurchaseInvoice (Nota Fiscal de Entrada)

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK, gerado pelo banco |
| unidade_id | uuid | FK Unidade; escopo de tenancy |
| supplier_id | uuid | FK Supplier; nullable até confirmação do cadastro |
| number | varchar(20) | Número da NF |
| series | varchar(5) | Série da NF |
| access_key | varchar(44) | Chave de acesso da NFe (44 dígitos); único por unidade; nullable para entrada manual |
| issue_date | date | Data de emissão |
| entry_date | date | Data de entrada/recebimento |
| total_products_cents | integer | Soma dos valores dos produtos em centavos |
| total_freight_cents | integer | Frete total em centavos; default 0 |
| total_discount_cents | integer | Desconto total em centavos; default 0 |
| total_tax_cents | integer | Total de impostos em centavos; default 0 |
| total_invoice_cents | integer | Valor total da nota em centavos |
| xml_storage_key | varchar(512) | Chave do XML no storage (S3/R2); nullable |
| pdf_storage_key | varchar(512) | Chave do PDF no storage (S3/R2); nullable |
| xml_url | varchar(512) | URL pública do XML; nullable |
| pdf_url | varchar(512) | URL pública do PDF; nullable |
| status | enum | `DRAFT`, `CONFIRMED`, `CANCELLED` |
| entry_method | enum | `MANUAL`, `XML` |
| notes | text | Observações internas; nullable |
| created_at | timestamptz | Gerado pelo banco |
| updated_at | timestamptz | Atualizado automaticamente |

### PurchaseInvoiceItem (Item da Nota)

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| invoice_id | uuid | FK PurchaseInvoice |
| product_id | uuid | FK Product; nullable até vínculo confirmado |
| brand_id | uuid | FK Brand; nullable; pode ser sobrescrito por item |
| lot_id | uuid | FK Lot; nullable; gerado/vinculado na confirmação |
| sequence | integer | Número sequencial do item na nota |
| description | varchar(500) | Descrição do produto conforme a nota |
| ncm | varchar(8) | NCM do item (extraído do XML ou informado) |
| cfop | varchar(5) | CFOP do item |
| unit | varchar(10) | Unidade de medida (UN, KG, CX, etc.) |
| quantity | numeric(12,3) | Quantidade |
| unit_cost_cents | integer | Custo unitário em centavos |
| total_cost_cents | integer | Custo total do item em centavos |
| unit_freight_cents | integer | Frete rateado por item em centavos; default 0 |
| tax_icms_cents | integer | ICMS em centavos; default 0 |
| tax_ipi_cents | integer | IPI em centavos; default 0 |
| tax_pis_cents | integer | PIS em centavos; default 0 |
| tax_cofins_cents | integer | COFINS em centavos; default 0 |
| status | enum | `PENDING_LINK`, `LINKED`, `IGNORED` |
| created_at | timestamptz | Gerado pelo banco |

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| GET | /purchase-invoices | Auth+RBAC | Listar notas paginadas; filtros: supplier_id, status, data, number |
| GET | /purchase-invoices/:id | Auth+RBAC | Buscar nota por ID com itens |
| POST | /purchase-invoices | Auth+RBAC | Criar nota manual (entry_method: MANUAL) |
| POST | /purchase-invoices/upload-xml | Auth+RBAC | Upload de XML; parseia e retorna rascunho para revisão |
| PATCH | /purchase-invoices/:id | Auth+RBAC | Atualizar cabeçalho da nota (apenas DRAFT) |
| PATCH | /purchase-invoices/:id/items/:itemId | Auth+RBAC | Atualizar item: vincular produto, marca, lote |
| POST | /purchase-invoices/:id/apply-brand | Auth+RBAC | Aplicar uma marca a todos os itens da nota de uma vez |
| POST | /purchase-invoices/:id/confirm | Auth+RBAC | Confirmar nota: cria/atualiza lotes e movimentações de estoque |
| POST | /purchase-invoices/:id/cancel | Auth+RBAC | Cancelar nota CONFIRMED (estorna movimentações) |
| POST | /purchase-invoices/:id/upload-pdf | Auth+RBAC | Upload de PDF da nota |
| DELETE | /purchase-invoices/:id | Auth+RBAC | Excluir nota em DRAFT (não remove notas confirmadas) |

## Regras de Negócio

### Caminho XML
- O upload do XML (multipart `application/xml`) é processado **na requisição** como parse imediato (o arquivo é pequeno). O resultado é retornado como um objeto de rascunho (`DRAFT`) para revisão antes da confirmação.
- O XML é validado como NFe válida (tag `nfeProc` ou `NFe`). XMLs corrompidos ou de outros tipos são rejeitados com erro 422.
- O CNPJ do emitente (tag `emit/CNPJ`) é usado para localizar o fornecedor via `GET /suppliers/by-document`. Se não encontrado, o rascunho indica que o fornecedor precisa ser cadastrado; o operador vincula ou cria antes de confirmar.
- Os itens são extraídos da tag `det`; campos NCM, CFOP, descrição, quantidade, valores e impostos são pré-preenchidos.
- O XML original é armazenado no storage (S3/R2) e o campo `xml_storage_key` é preenchido.

### Aplicação de Marca
- `POST /purchase-invoices/:id/apply-brand` substitui o `brand_id` de todos os itens com status `PENDING_LINK` ou `LINKED` pela marca informada.
- Cada item pode ter seu `brand_id` sobrescrito individualmente via `PATCH /purchase-invoices/:id/items/:itemId`.

### Confirmação
- Só é possível confirmar uma nota com status `DRAFT`.
- Todos os itens com status `LINKED` devem ter `product_id` preenchido. Itens `IGNORED` são pulados. Itens `PENDING_LINK` sem produto bloqueiam a confirmação (retornar erro 422 listando os itens pendentes).
- Na confirmação, para cada item `LINKED`:
  1. Se `lot_id` não informado, criar um novo `Lot` com a validade informada (ou sem validade, se não aplicável).
  2. Registrar uma `StockMovement` do tipo `PURCHASE_ENTRY` vinculada à nota e ao lote.
  3. O saldo do estoque é derivado das movimentações — nunca atualizar campo de saldo diretamente.
- A confirmação é executada em uma única transação de banco. Falha em qualquer etapa faz rollback total.
- Nota confirmada não pode ser editada; apenas cancelada.

### Cancelamento
- Cancelar uma nota `CONFIRMED` gera movimentações de estorno (`PURCHASE_CANCEL`) para cada lote afetado, dentro de uma transação.
- Nota `DRAFT` pode ser excluída diretamente.

### Valores monetários
- Todos os valores são armazenados em centavos (inteiro). Valores do XML em reais são convertidos multiplicando por 100 e arredondando.

## Invariantes Críticos

- **Nunca** manipular saldo de estoque diretamente — toda entrada gera `StockMovement`.
- Confirmação em transação atômica: ou todos os lotes e movimentações são criados, ou nenhum é.
- Chave de acesso (44 dígitos) deve ser única por unidade — rejeitar duplicata com erro 409.
- Todo valor monetário em centavos (integer), nunca float.
- `unidade_id` sempre do contexto autenticado.
- XML e PDF armazenados no storage; URLs não são caminhos locais.

## Dependências

- **Upstream (usa):**
  - `Fornecedores` — vinculação pelo CNPJ
  - `Produtos` — vinculação dos itens da nota
  - `Marcas` — aplicação por lote ou por item
  - `Lotes` — criação de lotes na confirmação
  - `Estoque` — registro de movimentações de entrada
  - `Storage (S3/R2)` — armazenamento de XML e PDF
- **Downstream (usado por):**
  - `Estoque` — movimentações de entrada originadas aqui
  - `Relatórios` — histórico de compras

## Skills Relevantes

- `nestjs-erp-module` — estrutura padrão de módulo (sempre)
- `fiscal-br` — parse de XML de NFe, campos NCM/CFOP/CEST/CST, validação de chave de acesso, CNPJ do emitente
- `estoque-lote-fifo` — criação de lotes e movimentações de entrada na confirmação

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após qualquer alteração
- `escritor-de-testes` — para testes do fluxo de confirmação (transação + movimentações)

## Critérios de Aceite

- [ ] Upload de XML válido de NFe extrai fornecedor (CNPJ), itens, valores e impostos corretamente
- [ ] XML inválido ou de tipo diferente retorna erro 422 com mensagem descritiva
- [ ] CNPJ do emitente localiza o fornecedor existente ou indica necessidade de cadastro
- [ ] `apply-brand` aplica a marca a todos os itens `PENDING_LINK` e `LINKED` da nota
- [ ] Nota com itens `PENDING_LINK` sem produto bloqueia confirmação com lista dos pendentes
- [ ] Confirmação cria lotes e `StockMovement` de entrada em transação atômica
- [ ] Falha na confirmação faz rollback completo — nenhum lote ou movimentação parcial persiste
- [ ] Chave de acesso duplicada na mesma unidade retorna erro 409
- [ ] Cancelamento de nota confirmada gera movimentações de estorno
- [ ] Todos os valores armazenados em centavos
- [ ] XML e PDF armazenados no storage com chave registrada no banco
- [ ] Endpoints documentados no Swagger
