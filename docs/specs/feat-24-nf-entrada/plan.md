# Notas Fiscais de Entrada (feat/24)

Se retomando este trabalho, leia `architecture.md` e retome a última fase incompleta.

## FASE 1 — Schema + Migration [Não Iniciada ⏳]

### Tarefa A — schema.prisma
Adicionar ao `apps/api/prisma/schema.prisma`:
1. Enum `NfEntradaStatus { RASCUNHO CONFIRMADA CANCELADA }`
2. Model `NfEntrada` (ver architecture.md — campos, relations, index, map)
3. Model `NfEntradaItem` (ver architecture.md)
4. Back-relations em modelos existentes:
   - `Supplier.nf_entradas NfEntrada[]`
   - `Product.nf_entrada_items NfEntradaItem[]`
   - `Brand.nf_entrada_items NfEntradaItem[]`
   - `Lot.invoice_item NfEntradaItem? @relation(fields: [invoice_item_id], references: [id])` (formalizar FK do campo orphan existente)

### Tarefa B — Migration
Criar `apps/api/prisma/migrations/20260617140000_nf_entrada/migration.sql`:
```sql
CREATE TYPE "NfEntradaStatus" AS ENUM ('RASCUNHO', 'CONFIRMADA', 'CANCELADA');

CREATE TABLE "nf_entradas" (
  "id"            TEXT NOT NULL,
  "unidade_id"    TEXT NOT NULL,
  "fornecedor_id" TEXT,
  "numero"        VARCHAR(10) NOT NULL,
  "serie"         VARCHAR(3),
  "chave_acesso"  CHAR(44),
  "data_emissao"  DATE NOT NULL,
  "data_entrada"  DATE,
  "valor_total"   INTEGER NOT NULL DEFAULT 0,
  "status"        "NfEntradaStatus" NOT NULL DEFAULT 'RASCUNHO',
  "xml_url"       TEXT,
  "pdf_url"       TEXT,
  "observacao"    TEXT,
  "created_by"    TEXT NOT NULL,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "nf_entradas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nf_entradas_unidade_id_chave_acesso_key" ON "nf_entradas"("unidade_id", "chave_acesso") WHERE "chave_acesso" IS NOT NULL;
CREATE INDEX "idx_nf_entradas_unidade_status" ON "nf_entradas"("unidade_id", "status");
CREATE INDEX "idx_nf_entradas_fornecedor" ON "nf_entradas"("fornecedor_id");

ALTER TABLE "nf_entradas" ADD CONSTRAINT "nf_entradas_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nf_entradas" ADD CONSTRAINT "nf_entradas_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "nf_entrada_items" (
  "id"              TEXT NOT NULL,
  "nf_entrada_id"   TEXT NOT NULL,
  "numero_item"     INTEGER NOT NULL,
  "codigo_produto"  VARCHAR(60),
  "ean"             VARCHAR(14),
  "descricao"       VARCHAR(500) NOT NULL,
  "ncm"             VARCHAR(8),
  "cfop"            VARCHAR(4),
  "unidade_medida"  VARCHAR(6),
  "quantidade"      DECIMAL(12,3) NOT NULL,
  "valor_unitario"  INTEGER NOT NULL,
  "valor_total"     INTEGER NOT NULL,
  "lote_numero"     VARCHAR(100),
  "data_validade"   DATE,
  "data_fabricacao" DATE,
  "product_id"      TEXT,
  "brand_id"        TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "nf_entrada_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_nf_entrada_items_nf" ON "nf_entrada_items"("nf_entrada_id");
CREATE INDEX "idx_nf_entrada_items_product" ON "nf_entrada_items"("product_id");

ALTER TABLE "nf_entrada_items" ADD CONSTRAINT "nf_entrada_items_nf_entrada_id_fkey" FOREIGN KEY ("nf_entrada_id") REFERENCES "nf_entradas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nf_entrada_items" ADD CONSTRAINT "nf_entrada_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nf_entrada_items" ADD CONSTRAINT "nf_entrada_items_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Formalizar FK orphan existente em lots.invoice_item_id → nf_entrada_items.id
ALTER TABLE "lots" ADD CONSTRAINT "lots_invoice_item_id_fkey" FOREIGN KEY ("invoice_item_id") REFERENCES "nf_entrada_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### Testes desta fase
- [ ] `pnpm --filter @zk/api exec tsc --noEmit` sem erros após schema changes
- [ ] Migration aplica sem erros em banco local

## FASE 2 — XML Parser Service [Não Iniciada ⏳]

### Tarefa A — instalar fast-xml-parser
```bash
pnpm --filter @zk/api add fast-xml-parser
```

### Tarefa B — xml-parser.service.ts
`apps/api/src/modules/nf-entrada/xml-parser.service.ts`:
- `@Injectable()` standalone (sem depender de Prisma)
- `parse(xmlBuffer: Buffer): ParsedNfXml` — retorna objeto tipado com campos do cabeçalho e itens
- Configuração XMLParser: `ignoreAttributes: false, attributeNamePrefix: '@_', parseTagValue: false, isArray: (name) => ['det','rastro'].includes(name)`
- Extrai:
  - `chaveAcesso`: `infNFe['@_Id'].replace(/^NFe/, '')`
  - `numero`: `ide.nNF`
  - `serie`: `ide.serie`
  - `dataEmissao`: `ide.dhEmi`
  - `emitCnpj`: `emit.CNPJ`
  - `emitNome`: `emit.xNome`
  - `valorTotal`: `Math.round(parseFloat(total.ICMSTot.vNF) * 100)`
  - `items[]`: para cada `det`:
    - `numeroItem`, `ean`, `codigoProduto`, `descricao`, `ncm`, `cfop`, `unidadeMedida`
    - `quantidade`: `parseFloat(prod.qCom)`
    - `valorUnitario`: `Math.round(parseFloat(prod.vUnCom) * 100)`
    - `valorTotal`: `Math.round(parseFloat(prod.vProd) * 100)`
    - `rastro`: pegar o primeiro elemento (se array), extrair `loteNumero`, `dataValidade`, `dataFabricacao`
- `class ParsedNfXml { ... }` com tipos explícitos — sem `any`
- Lança `UnprocessableEntityException` se XML mal-formado ou elemento obrigatório ausente

### Testes desta fase
- [ ] Parsing de XML NFe real com 1 item retorna campos corretos
- [ ] Parsing de XML NFe com múltiplos `det` retorna array correto
- [ ] XML sem `rastro` não falha
- [ ] `cEAN = 'SEM GTIN'` é normalizado para `null`

## FASE 3 — DTOs [Não Iniciada ⏳]

`apps/api/src/modules/nf-entrada/dto/`:

**`create-nf.dto.ts`** — criação manual:
```typescript
class CreateNfDto {
  @IsString() @IsOptional() @IsUUID() fornecedor_id?: string
  @IsString() @MaxLength(10) numero: string
  @IsString() @IsOptional() @MaxLength(3) serie?: string
  @IsString() @IsOptional() @Matches(/^\d{44}$/) chave_acesso?: string
  @IsISO8601() data_emissao: string
  @IsISO8601() @IsOptional() data_entrada?: string
  @IsInt() @Min(0) valor_total: number
  @IsString() @IsOptional() @MaxLength(1000) observacao?: string
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateNfItemDto) items: CreateNfItemDto[]
}

class CreateNfItemDto {
  @IsInt() @Min(1) numero_item: number
  @IsString() @IsOptional() @MaxLength(60) codigo_produto?: string
  @IsString() @IsOptional() @MaxLength(14) ean?: string
  @IsString() @MaxLength(500) descricao: string
  @IsString() @IsOptional() @MaxLength(8) ncm?: string
  @IsString() @IsOptional() @MaxLength(4) cfop?: string
  @IsString() @IsOptional() @MaxLength(6) unidade_medida?: string
  @IsNumber() @Min(0) quantidade: number
  @IsInt() @Min(0) valor_unitario: number
  @IsInt() @Min(0) valor_total: number
  @IsString() @IsOptional() @MaxLength(100) lote_numero?: string
  @IsISO8601() @IsOptional() data_validade?: string
  @IsISO8601() @IsOptional() data_fabricacao?: string
  @IsUUID() @IsOptional() product_id?: string
  @IsUUID() @IsOptional() brand_id?: string
}
```

**`update-nf.dto.ts`** — atualizar cabeçalho:
```typescript
class UpdateNfDto {
  @IsUUID() @IsOptional() fornecedor_id?: string
  @IsISO8601() @IsOptional() data_entrada?: string
  @IsString() @IsOptional() @MaxLength(1000) observacao?: string
}
```

**`update-nf-item.dto.ts`** — vincular produto/marca:
```typescript
class UpdateNfItemDto {
  @IsUUID() @IsOptional() product_id?: string
  @IsUUID() @IsOptional() brand_id?: string
  @IsString() @IsOptional() @MaxLength(100) lote_numero?: string
  @IsISO8601() @IsOptional() data_validade?: string
  @IsISO8601() @IsOptional() data_fabricacao?: string
}
```

**`bulk-brand.dto.ts`** — aplicar marca a todos os itens:
```typescript
class BulkBrandDto {
  @IsUUID() brand_id: string
}
```

**`query-nf.dto.ts`**:
```typescript
class QueryNfDto {
  @IsEnum(NfEntradaStatus) @IsOptional() status?: NfEntradaStatus
  @IsUUID() @IsOptional() fornecedor_id?: string
  @IsISO8601() @IsOptional() data_inicio?: string
  @IsISO8601() @IsOptional() data_fim?: string
  @IsInt() @Min(1) @IsOptional() @Type(Number) page: number = 1
  @IsInt() @Min(1) @Max(100) @IsOptional() @Type(Number) limit: number = 20
}
```

## FASE 4 — Repository [Não Iniciada ⏳]

`apps/api/src/modules/nf-entrada/nf-entrada.repository.ts`:

```typescript
findAll(unitId, filters, pagination)                        // paginado, inclui fornecedor (select parcial)
findById(id, unitId)                                        // com items (include items)
create(data: CreateNfInput)                                 // cabeçalho + items via nested write
update(id, unitId, data: Prisma.NfEntradaUpdateInput)       // apenas RASCUNHO
updateItem(itemId, nfId, data: Prisma.NfEntradaItemUpdateInput) // com check nf_entrada_id = nfId (TOCTOU)
bulkSetBrand(nfId, unitId, brandId)                         // UPDATE SET brand_id WHERE nf_entrada_id AND nf.unidade_id
updateStatus(id, unitId, status)                            // CONFIRMADA | CANCELADA
countUnlinkedItems(nfId, unitId)                            // count items WHERE product_id IS NULL
findItemsByNf(nfId, unitId)                                 // para confirmar
```

Todos os métodos de mutação incluem `unidade_id` no WHERE (TOCTOU prevention).

## FASE 5 — Service [Não Iniciada ⏳]

`apps/api/src/modules/nf-entrada/nf-entrada.service.ts`:

- `createFromXml(buffer, dto, user)` — parse XML, auto-cria/vincula fornecedor, salva arquivo, cria NF rascunho
- `create(dto, user)` — criação manual
- `listNfs(query, user)` — paginado
- `getNf(id, user)` — com items
- `updateNf(id, dto, user)` — valida RASCUNHO
- `updateItem(id, itemId, dto, user)` — valida product_id existe na unidade
- `bulkSetBrand(id, dto, user)` — aplica brand a todos os items
- `attachPdf(id, buffer, user)` — armazena PDF via StorageService, atualiza pdf_url
- `confirmNf(id, user)` — valida todos items vinculados → $transaction: cria lotes + movimentos → marca CONFIRMADA
- `cancelNf(id, user)` — valida RASCUNHO → marca CANCELADA

### confirmNf em detalhe:
```
1. findById(id, unitId) — lança 404 se não encontrado
2. Se status != RASCUNHO → 422 ("Apenas notas em rascunho podem ser confirmadas")
3. countUnlinkedItems(id) > 0 → 422 ("X itens sem produto vinculado")
4. findItemsByNf(id, unitId) → items[]
5. prisma.$transaction(async (tx) => {
     for (const item of items) {
       const lot = await lotsRepository.createWithTx(tx, {
         unidade_id: unitId,
         product_id: item.product_id,
         code: item.lote_numero || `NF${nf.numero}-I${item.numero_item}`,
         quantity_received: item.quantidade,
         expires_at: item.data_validade,
         manufactured_at: item.data_fabricacao,
         invoice_item_id: item.id,
       });
       await stockRepository.createMovementWithTx(tx, {
         unidade_id: unitId,
         product_id: item.product_id,
         lot_id: lot.id,
         type: StockMovementType.PURCHASE_ENTRY,
         quantity: item.quantidade,
         reference_id: item.id,
         reference_type: 'invoice_item',
         idempotency_key: `nf-confirm-${item.id}`,
         notes: `NF ${nf.numero} - Item ${item.numero_item}`,
         created_by: user.sub,
       });
     }
     await tx.nfEntrada.update({ where: { id, unidade_id: unitId }, data: { status: 'CONFIRMADA' } });
   })
```

## FASE 6 — Controller + Module [Não Iniciada ⏳]

**`nf-entrada.controller.ts`** — todos os endpoints (ver architecture.md).
- `POST /nf-entrada/from-xml` usa `@UseInterceptors(FileInterceptor('xml'))` + `@UploadedFile()`
- `POST /nf-entrada/:id/attach-pdf` usa `FileInterceptor('pdf')`
- Todos com `@Roles(SystemRole.ADMINISTRADOR)` exceto `GET` que aceita `OPERADOR_PDV` também

**`nf-entrada.module.ts`**:
```typescript
@Module({
  imports: [LotsModule, StockModule, SuppliersModule, StorageModule],
  controllers: [NfEntradaController],
  providers: [NfEntradaRepository, NfEntradaService, XmlParserService],
})
```

**`app.module.ts`**: adicionar `NfEntradaModule`.

### Testes desta fase
- [ ] `pnpm --filter @zk/api exec tsc --noEmit` sem erros
- [ ] `POST /nf-entrada` manual → 201
- [ ] `POST /nf-entrada/:id/confirm` sem itens vinculados → 422
- [ ] `POST /nf-entrada/:id/confirm` com todos vinculados → Lote criado + StockMovement criado
- [ ] Double-confirm (idempotency_key) → não duplica movimento

## Invariantes críticos (checar em cada fase)

- `unidade_id` obrigatório em TODA query de mutação (TOCTOU prevention)
- NF CONFIRMADA é imutável — update/cancel devem rejeitar 422
- Valores monetários em centavos (Int), nunca float
- Criação de Lote + StockMovement dentro de `$transaction` — sem estado parcial
- `idempotency_key = 'nf-confirm-{item.id}'` — confirmar duas vezes é idempotente
- `StorageFolder.INVOICE_XML` / `INVOICE_PDF` são PROTECTED_FOLDERS (never delete)
- CNPJ do fornecedor: validar formato 14 dígitos antes de criar/vincular
