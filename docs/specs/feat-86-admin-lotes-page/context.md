# Context: feat-86 — Admin Lotes Page

Collected from codebase audit on 2026-06-19.

---

## 1. Lotes API Endpoints

Base path: `/lots`  
Auth: Bearer token (`access-token`)  
Required roles (default): `ADMINISTRADOR` | `OPERADOR_ESTOQUE_COMPRAS`

### GET /lots
List lots with pagination and filters.

**Query params (`QueryLotsDto`):**
| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | integer ≥ 1 | 1 | |
| `limit` | integer 1–100 | 20 | |
| `product_id` | UUID | — | Exact match |
| `code` | string | — | Partial, case-insensitive |
| `active` | boolean | — | Transform: `'true'` → `true` |
| `expires_before` | YYYY-MM-DD | — | `expires_at <= date` |
| `expires_after` | YYYY-MM-DD | — | `expires_at >= date` |
| `tags` | string[] | — | `hasSome` (OR logic) |

**Response shape:**
```ts
{
  data: LotRecord[],
  total: number,
  page: number,
  limit: number
}
```

**`LotRecord` fields** (Prisma `Lot` model):
- `id` (UUID)
- `code` (string, max 100)
- `product_id` (UUID)
- `unidade_id` (UUID — scoped automatically, not returned to client in most uses)
- `invoice_item_id` (UUID | null)
- `quantity_received` (Decimal)
- `expires_at` (DateTime | null)
- `manufactured_at` (DateTime | null)
- `tags` (string[])
- `notes` (string | null)
- `active` (boolean)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Default sort:** `created_at DESC`

---

### GET /lots/expiring
Lots expiring within the next N days (active only, `expires_at` not null).

**Query params (`QueryExpiringDto`):**
| Param | Type | Default | Notes |
|---|---|---|---|
| `days` | integer 1–365 | 30 | Window in days from today |
| `page` | integer ≥ 1 | 1 | |
| `limit` | integer 1–100 | 20 | |

**Response:** same paginated shape as GET /lots.  
**Sort:** `expires_at ASC`.

---

### GET /lots/by-product/:productId
Lots for a product in FIFO order (nearest expiry first).

**Path param:** `productId` (UUID)  
**Query params:** `page` (int, default 1), `limit` (int, default 20)

**Response:** same paginated shape.  
**Sort:** `expires_at ASC NULLS LAST`, then `created_at ASC`.

---

### GET /lots/:id
Single lot by UUID. Includes computed `balance` field.

**Path param:** `id` (UUID)  
**Response:**
```ts
LotRecord & { balance: number }
```
`balance` = `SUM(quantity)` from `stock_movements WHERE lot_id = :id`. Can be 0 or negative if movements exceed received quantity.

---

### POST /lots
Create a lot.

**Body (`CreateLotDto`):**
| Field | Type | Required | Notes |
|---|---|---|---|
| `product_id` | UUID | yes | |
| `code` | string (max 100) | yes | Unique per product+unit |
| `quantity_received` | number (max 3 decimals, min 0.001) | yes | Stored as Decimal |
| `invoice_item_id` | UUID | no | Link to NF entry item |
| `expires_at` | YYYY-MM-DD | no | |
| `manufactured_at` | YYYY-MM-DD | no | |
| `tags` | string[] | no | Default: `[]` |
| `notes` | string | no | |
| `active` | boolean | no | Default: `true` |

**Responses:** 201 (created) | 409 (duplicate code for same product+unit)

---

### PATCH /lots/:id
Update mutable metadata only.

**Mutable fields (`UpdateLotDto`):** `code`, `expires_at`, `manufactured_at`, `tags`, `notes`, `active`  
**Immutable (never in UpdateLotDto):** `product_id`, `invoice_item_id`, `quantity_received`

**Responses:** 200 | 404 | 409 (code conflict)

---

### DELETE /lots/:id
Soft-delete (sets `active = false`).

**Required role:** `ADMINISTRADOR` only (overrides class-level role).  
**Responses:** 204 | 404 | 409 (lot has positive balance — cannot deactivate)

---

## 2. EstoquePage Patterns to Replicate

**File:** `apps/admin/src/pages/estoque/EstoquePage.tsx`

### Structure
- Top-level layout: `p-6 space-y-5`
- Page header: `font-display text-3xl font-bold` title + subtitle with summary counts
- Summary badges inline with subtitle: warning-colored "X críticos", destructive-colored "X vencidos" (conditionally shown)
- Two tabs (`Tabs`, `TabsList`, `TabsTrigger`) — "Lotes" and "Movimentações"

### State pattern
All filtering is currently client-side (mock data). The real implementation should move filtering to API query params.

**Lotes tab state:**
- `lotesBusca: string` — search text (product name, SKU, lot code)
- `lotesStatus: 'all' | 'normal' | 'critico' | 'vencido'` — status chip toggle
- `lotesPage: number`

**Movimentações tab state:**
- `movBusca: string`
- `movTipo: 'all' | StockMovementType`
- `movPage: number`

### Filter bar pattern
Wrapped in `rounded-lg border border-border bg-card p-4 shadow-sm`.  
Flex row with:
1. Search Input with `Search` icon (lucide) — `relative`, `pl-9`, min-w 200px, flex-1
2. Status chips (ToggleChip) — pill-shaped toggle buttons, active = `bg-primary text-primary-foreground`
3. "Limpar" ghost Button with `X` icon — shown only when `temFiltro` is truthy

### ToggleChip component (inline, no separate file)
```tsx
<button className={cn(
  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
  active
    ? 'bg-primary text-primary-foreground border-primary'
    : 'border-border text-muted-foreground hover:border-primary hover:text-foreground',
)} />
```

### Pagination pattern (in table components)
- "Anterior" / "Próxima" outline Buttons, disabled at boundaries
- Footer: `{total} lotes · página {page} de {totalPages}` (singular/plural handled)

---

## 3. LotesTable columns

Columns: **Produto** | **Lote** | **Validade** | **Qtd Disponível** (right-aligned) | **Status** (centered) | **Notas**

- **Produto cell:** two lines — product name (`font-medium`) + SKU (`text-xs font-mono text-muted-foreground`)
- **Lote cell:** `font-mono text-sm`
- **Validade cell:** formatted `toLocaleDateString('pt-BR')`, dates without time appended as `T12:00:00` to avoid UTC-3 offset shifting the day
- **Qtd Disponível:** `tabular-nums font-semibold text-right`, formatted with `toLocaleString('pt-BR')`
- **Status badge:** `Badge variant="outline"` with status-specific color classes
- **Notas:** truncated, max-w-[200px]
- Row: alternating zebra (`bg-muted/10`), hover `bg-muted/20`, inactive rows `opacity-50`

**Status config:**
```ts
normal:  { label: 'Normal',  className: 'border-success/40 bg-success/10 text-success' }
critico: { label: 'Crítico', className: 'border-warning/40 bg-warning/10 text-warning' }
vencido: { label: 'Vencido', className: 'border-destructive/40 bg-destructive/10 text-destructive' }
```

**Status derivation logic (from mock):**
- `vencido`: `expires_at` exists AND `new Date(expires_at) < new Date()`
- `critico`: `quantityAvailable <= 5`
- `normal`: otherwise

The real page will derive status from `balance` (from API) and `expires_at` from the `LotRecord`.

---

## 4. MovimentacoesTable columns

Columns: **Data** | **Tipo** | **Produto** | **Lote** | **Quantidade** | **Origem** | **Usuário**

- **Data:** `toLocaleString('pt-BR')` with date+time (dd/mm/yyyy HH:MM)
- **Tipo:** `Badge variant="outline"` with type-specific colors
- **Produto:** two lines (name + SKU mono), truncated
- **Lote:** `font-mono text-xs text-muted-foreground`
- **Quantidade:** right-aligned, `+` / `-` prefix with arrow icon (ArrowDownCircle for entrada, ArrowUpCircle for saída)
- **Origem:** shows `referenceId` (mono) or `notes` (italic) or `—`
- **Usuário:** text-xs

**Entrada types** (positive, `text-success`): `PURCHASE_ENTRY`, `SALE_RETURN`, `MANUAL_ENTRY`, `TRANSFER_IN`  
**Saída types** (negative, `text-destructive`): `SALE_OUT`, `PURCHASE_CANCEL`, `MANUAL_EXIT`, `TRANSFER_OUT`

---

## 5. Available UI Components (`apps/admin/src/components/ui/`)

- `badge.tsx`
- `button.tsx`
- `card.tsx`
- `date-picker.tsx`
- `dialog.tsx`
- `dropdown-menu.tsx`
- `input.tsx`
- `number-input.tsx`
- `qr-code.tsx`
- `select.tsx`
- `separator.tsx`
- `sheet.tsx`
- `tabs.tsx`

---

## 6. CSS / Brand Tokens (`apps/admin/src/index.css`)

### Semantic tokens (shadcn/ui)
| Token | Value |
|---|---|
| `--background` | `#F9EEE4` |
| `--foreground` | `#5E3917` |
| `--card` | `#FFFDF9` |
| `--card-foreground` | `#3D2A14` |
| `--primary` | `#D66D25` (orange) |
| `--primary-foreground` | `#F9EEE4` |
| `--secondary` | `#C7C7A1` (sage) |
| `--muted` | `#F4E9DB` |
| `--muted-foreground` | `#937E66` |
| `--accent` | `#F4E9DB` |
| `--destructive` | `#B23A1E` (red) |
| `--border` | `#E6D8C6` |
| `--ring` | `#D66D25` |
| `--radius` | `12px` |

### Brand tokens (extended)
| Token | Value | Tailwind class |
|---|---|---|
| `--brand-cream` | `#F9EEE4` | `bg-brand-cream` |
| `--brand-brown` | `#5E3917` | `text-brand-brown` |
| `--brand-ochre` | `#8E6219` | `text-brand-ochre` |
| `--brand-orange` | `#D66D25` | `bg-brand-orange` |
| `--brand-sage` | `#C7C7A1` | `bg-brand-sage` |
| `--brand-forest` | `#2F3E1F` | `bg-brand-forest` |
| `--brand-olive` | `#4C3A17` | `bg-brand-olive` |
| `--surface` | `#FFFDF9` | `bg-surface` |
| `--surface-alt` | `#F4E9DB` | `bg-surface-alt` |
| `--text-strong` | `#3D2A14` | `text-text-strong` |
| `--text-muted` | `#937E66` | `text-text-muted` |
| `--success` | `#3F6B2E` | `text-success` |
| `--warning` | `#C8881F` | `text-warning` |
| `--danger` | `#B23A1E` | `text-danger` |
| `--info` | `#4C3A17` | `text-info` |

### Typography
- `--font-display`: `"Fredoka"` — titles, KPIs (`font-display`)
- `--font-accent`: `"Sarina"` — decorative accents
- `--font-sans`: `"Inter"` — body

### Radii
- `--radius-sm`: 8px | `--radius-md`: 12px | `--radius-lg`: 16px | `--radius-pill`: 9999px

---

## 7. Gotchas and Missing Fields

### API side
1. **No `balance` in list endpoint.** `GET /lots` returns raw `LotRecord[]` without balance. Only `GET /lots/:id` includes `balance`. For the list page to show available quantity, either call the detail endpoint per row (N+1) or add balance computation to the list query via `$queryRaw` aggregation. The current LotesTable shows `quantityAvailable` which does not exist in `LotRecord` — it will need to come from either a computed field added to `findAll` or a separate stock_movements aggregate join.

2. **`unidade_id` in LotRecord.** The Prisma `Lot` type includes `unidade_id` — the frontend should not display it; it is scoped server-side.

3. **`quantity_received` is `Decimal`, not `number`.** When serializing via JSON, Prisma Decimal comes as a string from some serializers. Verify the API serializes this as a number or handle the string case on the frontend.

4. **No product name/SKU in LotRecord.** The list and detail responses return only `product_id`, not the product name or SKU. The real LotesTable needs either: (a) the API to join product data, or (b) a separate products lookup. The mock had `productName` and `sku` on `LoteMock` which does not exist in `LotRecord`.

5. **`tags` filter uses OR logic (`hasSome`).** Sending `?tags=a&tags=b` returns lotes with tag `a` OR tag `b`, not AND.

6. **`expires_before`/`expires_after` only filter rows where `expires_at IS NOT NULL`.** Lots with `null` expiry are excluded from date-range filters (Prisma DateTimeNullableFilter behavior).

7. **`DELETE` is ADMINISTRADOR only.** The deactivate endpoint overrides the class-level role. The UI should hide the delete action from `OPERADOR_ESTOQUE_COMPRAS` users.

8. **`critico` status threshold.** The mock uses `quantityAvailable <= 5` as the critical threshold. The real implementation should define this as a configurable value or derive it from a minimum stock field on the product.

9. **Date display UTC shift.** `LotesTable.tsx` already handles this: appending `T12:00:00` to date-only strings before parsing to avoid UTC midnight → local day shift in UTC-3. Apply the same pattern in the real page.

10. **No `manufactured_at` column in current table.** It exists in the API but is not displayed in the current LotesTable. Consider whether to expose it in the detail drawer or in the create/edit form.
