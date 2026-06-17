# Arquitetura — Notas Fiscais de Entrada (feat/24)

## Visão geral (antes → depois)

Antes: sem registro de notas de compra. Lotes criados manualmente via `POST /lots`; estoque movimentado por `POST /stock/movements`. Fornecedores sem vínculo a notas. `Lot.invoice_item_id` orphan (campo sem FK).

Depois: módulo `nf-entrada` gerencia o ciclo de vida de notas fiscais de compra — upload de XML ou cadastro manual, vinculação de itens a produtos existentes, confirmação que cria Lotes + StockMovements de forma atômica e idempotente.

## Componentes afetados

### Novos modelos (schema.prisma + migration)
- `NfEntradaStatus` enum: `RASCUNHO | CONFIRMADA | CANCELADA`
- `NfEntrada` — cabeçalho da nota
- `NfEntradaItem` — itens da nota

### Alterações em modelos existentes
- `Lot.invoice_item_id` — adiciona FK `@relation` para `NfEntradaItem` (campo já existe, apenas formaliza a relação)
- `Supplier` — back-relation `nf_entradas NfEntrada[]`
- `Product` — back-relation `nf_entrada_items NfEntradaItem[]`
- `Brand` — back-relation `nf_entrada_items NfEntradaItem[]`

### Novo módulo
- `apps/api/src/modules/nf-entrada/`

### Dependência nova
- `fast-xml-parser` v4 para parsing de XML NFe

## Modelo de dados

```prisma
enum NfEntradaStatus {
  RASCUNHO
  CONFIRMADA
  CANCELADA
}

model NfEntrada {
  id            String          @id @default(uuid())
  unidade_id    String
  fornecedor_id String?
  numero        String          @db.VarChar(10)
  serie         String?         @db.VarChar(3)
  chave_acesso  String?         @db.Char(44)
  data_emissao  DateTime        @db.Date
  data_entrada  DateTime?       @db.Date
  valor_total   Int             // centavos
  status        NfEntradaStatus @default(RASCUNHO)
  xml_url       String?
  pdf_url       String?
  observacao    String?         @db.Text
  created_by    String
  created_at    DateTime        @default(now())
  updated_at    DateTime        @updatedAt

  unidade    Unit         @relation(fields: [unidade_id], references: [id])
  fornecedor Supplier?    @relation(fields: [fornecedor_id], references: [id])
  items      NfEntradaItem[]

  @@unique([unidade_id, chave_acesso])
  @@index([unidade_id, status])
  @@index([fornecedor_id])
  @@map("nf_entradas")
}

model NfEntradaItem {
  id              String    @id @default(uuid())
  nf_entrada_id   String
  numero_item     Int
  codigo_produto  String?   @db.VarChar(60)
  ean             String?   @db.VarChar(14)
  descricao       String    @db.VarChar(500)
  ncm             String?   @db.VarChar(8)
  cfop            String?   @db.VarChar(4)
  unidade_medida  String?   @db.VarChar(6)
  quantidade      Decimal   @db.Decimal(12, 3)
  valor_unitario  Int       // centavos
  valor_total     Int       // centavos
  lote_numero     String?   @db.VarChar(100)
  data_validade   DateTime? @db.Date
  data_fabricacao DateTime? @db.Date
  // Vínculo definido pelo operador (antes de confirmar):
  product_id      String?
  brand_id        String?

  nf_entrada NfEntrada @relation(fields: [nf_entrada_id], references: [id], onDelete: Cascade)
  product    Product?  @relation(fields: [product_id], references: [id])
  brand      Brand?    @relation(fields: [brand_id], references: [id])
  lot        Lot?      // back-relation de Lot.invoice_item_id

  @@index([nf_entrada_id])
  @@map("nf_entrada_items")
}
```

## Endpoints

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| `POST` | `/nf-entrada/from-xml` | ADMINISTRADOR | Upload XML NFe → parse → retorna NF rascunho com itens |
| `POST` | `/nf-entrada` | ADMINISTRADOR | Criação manual (sem XML) |
| `GET` | `/nf-entrada` | ADMINISTRADOR | Listar (paginado, filtros: status, fornecedor, datas) |
| `GET` | `/nf-entrada/:id` | ADMINISTRADOR | Detalhe com itens |
| `PATCH` | `/nf-entrada/:id` | ADMINISTRADOR | Atualizar cabeçalho (apenas RASCUNHO) |
| `PATCH` | `/nf-entrada/:id/items/:itemId` | ADMINISTRADOR | Vincular produto/marca a item |
| `PATCH` | `/nf-entrada/:id/items` | ADMINISTRADOR | Bulk: aplicar brand_id a todos os itens |
| `POST` | `/nf-entrada/:id/attach-pdf` | ADMINISTRADOR | Upload do PDF/DANFE |
| `POST` | `/nf-entrada/:id/confirm` | ADMINISTRADOR | Confirmar → cria Lotes + StockMovements |
| `POST` | `/nf-entrada/:id/cancel` | ADMINISTRADOR | Cancelar (apenas RASCUNHO) |

## Fluxo de confirmação

```
POST /nf-entrada/:id/confirm
  ↓
Verificar status = RASCUNHO
Verificar todos os items têm product_id definido
  ↓
Para cada item (em transação $transaction):
  1. LotsService.create({ product_id, code: lote_numero || auto-gen, quantity_received, expires_at, invoice_item_id: item.id, ... })
  2. StockService/Repository: criar StockMovement(type=PURCHASE_ENTRY, idempotency_key=nf-confirm-{item.id})
  ↓
UPDATE nf_entradas SET status=CONFIRMADA
```

**Idempotência:** `idempotency_key = 'nf-confirm-{item.id}'` — confirmar duas vezes é seguro (segunda falha em unique constraint, não gera duplicata).

## Parsing de XML NFe

```typescript
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,      // manter strings para evitar perda de precisão monetária
  isArray: (name, jpath) =>
    name === 'det' || name === 'rastro',
});

const parsed = parser.parse(xmlString);
const infNFe = parsed?.nfeProc?.NFe?.infNFe ?? parsed?.NFe?.infNFe;
// chave_acesso: infNFe['@_Id'].replace(/^NFe/, '')
// items: infNFe.det (always array)
// valor monetário: Math.round(parseFloat(infNFe.det[n].prod.vUnCom) * 100)
```

## Auto-criação de fornecedor

Ao fazer upload de XML:
1. Extrair `emit.CNPJ` do XML (14 dígitos)
2. Verificar se existe `Supplier` com `document = cnpj AND unidade_id = unitId`
3. Se existe: vincular `fornecedor_id`
4. Se não existe: criar Supplier com `razao_social = emit.xNome`, `document = cnpj` (status ativo)

## Padrões mantidos

- Controller → Service → Repository; sem regra no controller
- TenancyService via `@Global()` — sem import explícito
- DTOs com `class-validator`; whitelist global
- Guards `JwtSystemGuard` + `RolesGuard` via APP_GUARD global
- Swagger docs em todos os endpoints
- Escopo obrigatório: todas as queries filtram por `unidade_id`
- Valores monetários em centavos (Int), nunca float
- `StorageFolder.INVOICE_XML` e `INVOICE_PDF` já definidos — usados para armazenar os arquivos

## Dependências de módulo

```typescript
@Module({
  imports: [
    LotsModule,      // LotsService para criar lotes
    StockModule,     // StockService/Repository para criar movimentos
    SuppliersModule, // SuppliersService para auto-criar fornecedor
    StorageModule,   // StorageService para salvar XML/PDF
  ],
})
export class NfEntradaModule {}
```

Cada um desses módulos deve exportar seu Service/Repository. Se não exportar, o construtor-de-modulo deve adicionar o export.

## Trade-offs

- **XML parsing síncrono**: NF-e XMLs têm no máximo ~990 itens e < 1MB. Parsing síncrono na request é aceitável. Queue seria over-engineering para este volume.
- **Confirmação síncrona**: Para uma NF típica (< 100 itens), criar lotes + movimentos dentro da request é aceitável. Para NFs grandes (> 200 itens), considerar queue em P2.
- **Produto deve existir antes de confirmar**: Evita criação de produtos "lixo" sem dados mínimos de precificação. O operador vincula manualmente ou cria o produto pela rota padrão.
- **Sem emissão de NFe**: Emissão via plataforma fiscal é P2. Este módulo só gerencia *entrada* (compra).

## Principais arquivos a criar

- `apps/api/prisma/schema.prisma` — adicionar NfEntrada, NfEntradaItem, back-relations
- `apps/api/prisma/migrations/20260617140000_nf_entrada/migration.sql`
- `apps/api/src/modules/nf-entrada/nf-entrada.module.ts`
- `apps/api/src/modules/nf-entrada/nf-entrada.controller.ts`
- `apps/api/src/modules/nf-entrada/nf-entrada.service.ts`
- `apps/api/src/modules/nf-entrada/nf-entrada.repository.ts`
- `apps/api/src/modules/nf-entrada/xml-parser.service.ts`
- `apps/api/src/modules/nf-entrada/dto/` (create, update, update-item, bulk-brand, query, attach-pdf)
- `apps/api/src/app.module.ts` — importar NfEntradaModule
