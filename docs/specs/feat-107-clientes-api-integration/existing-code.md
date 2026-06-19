# FEAT-107: Clientes API Integration — Existing Code Analysis

## 1. BACKEND API RESPONSE FIELDS

### Base Customer Response (GET /customers, GET /customers/:id)

**All fields returned to clients (post-processing by `toResponse()`):**

```typescript
interface CustomerResponse extends Omit<Customer, 'cpf_cnpj_enc' | 'data_nascimento_enc' | 'cpf_cnpj_hash'> {
  cpf_cnpj?: string | null;        // Only in /customers/:id/export (decrypted)
  data_nascimento?: string | null;  // Only in /customers/:id/export (decrypted)
}
```

**List Response (GET /customers):**
```typescript
interface CustomerResponsePage {
  data: CustomerResponse[];
  total: number;
  page: number;
  limit: number;
}
```

**Actual safe-view fields returned (normal endpoints):**
- `id` (UUID)
- `unidade_id` (UUID)
- `nome` (string, max 255 chars)
- `telefone_principal` (string, max 20 chars)
- `email` (string or null, max 255 chars)
- `dados_dinamicos` (JSON object; encrypted values masked as `***`)
- `consentimento_lgpd` (boolean)
- `consentimento_versao` (string or null, max 20 chars)
- `consentimento_em` (ISO datetime or null)
- `ativo` (boolean, default true)
- `created_at` (ISO datetime)
- `updated_at` (ISO datetime)
- `deleted_at` (ISO datetime or null)

**NEVER returned to clients (stripped by toResponse):**
- `cpf_cnpj_enc` (encrypted field)
- `data_nascimento_enc` (encrypted field)
- `cpf_cnpj_hash` (internal search hash)

---

## 2. QUERY/FILTER DTO — QueryCustomerDto

**Frontend must send these query parameters to GET /customers:**

```typescript
interface QueryCustomerDto {
  q?: string;              // Fuzzy search by name (pg_trgm similarity > 0.3 or ILIKE)
  telefone?: string;       // Prefix search on phone
  cpf_cnpj?: string;       // Exact search via hash (format: "123.456.789-09")
  email?: string;          // Case-insensitive email search
  ativo?: boolean;         // Filter by active status (default: undefined)
  page?: number;           // Pagination page (default: 1, min: 1)
  limit?: number;          // Items per page (default: 20, max: 100)
}
```

---

## 3. CURRENT FRONTEND FILTER STATE VARIABLES

**File: `/apps/admin/src/pages/clientes/components/ClientesFilter.tsx`**

```typescript
export interface ClientesFiltros {
  busca: string;            // Search by name/email/phone (local, not API)
  uf: string;               // State filter ("all" or 2-letter code: "SP", "RJ", etc)
  somenteAtivos: boolean;   // Local filter: show only ativo === true
  comConsentimento: boolean; // Local filter: show only consentimentoLgpd === true
}
```

**Initial state in ClientesPage.tsx:**
```typescript
const [filtros, setFiltros] = useState<ClientesFiltros>({
  busca: '',
  uf: 'all',
  somenteAtivos: false,
  comConsentimento: false,
})
```

**State variables for pagination:**
```typescript
const [page, setPage] = useState(1)
```

---

## 4. TABLE COLUMNS (ClientesTable.tsx)

Currently displays these columns:

1. **Cliente** — Avatar + nome + cpfCnpjMascarado (masked)
2. **Contato** — email + telefonePrincipal (formatted via maskPhone)
3. **Cidade/UF** — cidade + "/" + uf
4. **Cadastro** — dataCadastro (formatted as DD/MM/YYYY)
5. **Total gasto** — totalGastoCentavos (formatted as BRL currency, right-aligned)
6. **Pedidos** — totalPedidos (count, right-aligned)
7. **Status** — Badge: "Ativo" or "Inativo" + Shield icon (if consentimentoLgpd)
8. **Action** — Eye icon (navigate to detail)

---

## 5. CLIENT DETALHE PAGE FIELDS (ClienteDetalhe.tsx)

### KPI Cards Section
- Total de pedidos (from detalhe.pedidos.length)
- Total gasto (sum of finalized orders totalLiquidoCentavos, or falls back to mock)
- Ticket médio (totalGasto / finalized orders count)
- Último pedido (date of first order in list)

### "Dados pessoais" Section (6 fields, 3-col grid)
1. Nome completo — `base.nome`
2. CPF/CNPJ — `base.cpfCnpjMascarado` (masked, never plaintext)
3. Data de nascimento — `detalhe?.dataNascimento` (formatted as DD/MM/YYYY, shows `***` if missing)
4. E-mail — `base.email`
5. Telefone — `base.telefonePrincipal` (formatted via maskPhone)
6. Cadastrado em — `base.dataCadastro` (formatted as DD/MM/YYYY)

### "Endereços" Section (conditional)
- Only shown if `detalhe?.enderecos` exists and length > 0
- Fields per address:
  - logradouro, numero, complemento, bairro
  - cidade, uf, cep (formatted via maskCep)
  - Badge "Principal" if principal === true

### "Pedidos" Section
- Table showing orders from `detalhe?.pedidos ?? []`
- Columns: Nº (numero) | Data (criadoEm formatted) | Origem (mapped label) | Desconto (descontoTotalCentavos, right-aligned) | Total (totalLiquidoCentavos, formatted as BRL) | Status (badge with icon)

---

## 6. MOCK DATA STRUCTURE

**File: `/apps/admin/src/data/clientes.mock.ts`**

### ClienteMock Interface
```typescript
interface ClienteMock {
  id: string;
  nome: string;
  email: string;
  cpfCnpjMascarado: string;        // ⚠ camelCase! Mock-only field
  telefonePrincipal: string;        // ⚠ camelCase!
  cidade: string;                   // ⚠ NO backend equivalent at top level
  uf: string;                       // ⚠ NO backend equivalent at top level
  dataCadastro: string;             // ISO date string
  totalGastoCentavos: number;       // ⚠ Computed from orders, NOT in API
  totalPedidos: number;             // ⚠ Computed from orders count, NOT in API
  ativo: boolean;
  consentimentoLgpd: boolean;
}
```

### ClienteDetalheMock Interface
```typescript
interface ClienteDetalheMock extends ClienteMock {
  dataNascimento: string;           // ISO date string (masked in list view)
  enderecos: {
    id: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    principal: boolean;
  }[];
  pedidos: PedidoClienteMock[];
}
```

### PedidoClienteMock Interface
```typescript
interface PedidoClienteMock {
  id: string;
  numero: string;
  status: 'ABERTA' | 'FINALIZADA' | 'CANCELADA';
  origem: 'PDV' | 'ECOMMERCE' | 'WHATSAPP';
  totalLiquidoCentavos: number;
  descontoTotalCentavos: number;
  criadoEm: string;                 // ISO datetime
  finalizadaEm: string | null;
}
```

---

## 7. FIELDS TO REMOVE (NO BACKEND EQUIVALENT)

These mock fields have **NO corresponding field in the API**:

1. **`totalGastoCentavos`** — Must be computed client-side from related orders via Venda API
2. **`totalPedidos`** — Must be computed client-side from vendas count
3. **`cidade`** — NOT stored at customer level; comes from customer.address or shipping address
4. **`uf`** — NOT stored at customer level; comes from customer.address or shipping address
5. **`cpfCnpjMascarado`** — Mock helper; API never returns plaintext CPF/CNPJ (only decrypted in /export)

---

## 8. FIELDS TO RENAME (camelCase → snake_case)

Mock uses **camelCase**, API uses **snake_case**. Must rename when integrating:

| Mock (camelCase) | API (snake_case) | Notes |
|---|---|---|
| `telefonePrincipal` | `telefone_principal` | Direct 1:1 mapping |
| `dataCadastro` | `created_at` | Frontend rename only |
| `dataNascimento` | `data_nascimento` | In detail view only; masked in list |
| `consentimentoLgpd` | `consentimento_lgpd` | Direct 1:1 mapping |
| `cpfCnpjMascarado` | (n/a) | Frontend helper; never use plaintext from API |

---

## 9. BACKEND ROUTES & OPERATIONS

### List Customers (Paginated)
```http
GET /customers?q=search&telefone=11&cpf_cnpj=123.456.789-09&email=test@mail.com&ativo=true&page=1&limit=20
```
**Returns:** `CustomerResponsePage` with paginated safe-view customers

### Get Customer Detail
```http
GET /customers/:id
```
**Returns:** Single `CustomerResponse` (PII masked, no export)

### Export Customer (Decrypted)
```http
GET /customers/:id/export
```
**Returns:** `CustomerResponse` with cpf_cnpj & data_nascimento **decrypted** (LGPD Art. 18, IV)

### Create Customer
```http
POST /customers
Body: CreateCustomerDto
```
**Requires:** consentimento_lgpd = true, validates CPF/CNPJ via digit check & encrypts

### Update Customer
```http
PATCH /customers/:id
Body: UpdateCustomerDto
```
**Logs:** changed_fields in audit

### Delete Customer (Anonymize)
```http
DELETE /customers/:id
```
**Action:** Soft delete + anonymization (PII → "[ANONIMIZADO]"), not hard delete

---

## 10. CRITICAL INTEGRATION NOTES

### Security & Privacy

1. **CPF/CNPJ Encryption**: Backend encrypts all CPF/CNPJ with AES-256-GCM; frontend never sees plaintext except via `/export` (LGPD access right)
2. **Dynamic Fields**: `dados_dinamicos` JSON may contain encrypted CPF_CNPJ subfields; frontend masks these as `***` in safe view
3. **Audit Logging**: Every read/update/delete is logged with user ID + IP; LGPD compliant
4. **Address Data**: NOT stored on Customer model directly; must come from separate Venda.endereco_entrega or customer_addresses table (not yet visible in schema excerpt)

### Frontend Must Handle

1. **Local vs API filtering**: Current filters (uf, somenteAtivos, comConsentimento) are **local** in-memory filters on mock data; must transition to server-side pagination + filtering via QueryCustomerDto
2. **Computed fields**: totalGastoCentavos, totalPedidos, cidade, uf must be fetched from related Venda records, not stored on Customer
3. **Masking**: CPF/CNPJ always masked in list view (show `***.***.***-**`); only decrypted on explicit export action
4. **Date formatting**: Backend returns ISO 8601; frontend formats to `DD/MM/YYYY` for display
5. **Phone formatting**: Backend stores raw digits; frontend applies maskPhone() utility

### API Query Limitations

- **`q` (name search)**: Uses PostgreSQL pg_trgm fuzzy matching (similarity > 0.3 or ILIKE); not exact match
- **`telefone`**: Prefix search on raw digits (so "11" matches all SP numbers starting with 11)
- **`cpf_cnpj`**: Hash-based exact search; frontend must format input first
- **Pagination**: Max 100 items per page; defaults to 20

---

## 11. MOCK DATA SAMPLE

Current mock has **12 customers** (IDs 1–12), with only customer ID "1" having detail data in `CLIENTE_DETALHE_MOCK`:

```typescript
{
  id: '1',
  nome: 'Ana Paula Ferreira',
  email: 'anapaula@email.com',
  cpfCnpjMascarado: '***.*23.456-**',
  telefonePrincipal: '(11) 99123-4567',
  cidade: 'São Paulo',
  uf: 'SP',
  dataCadastro: '2025-03-15',
  totalGastoCentavos: 128950,
  totalPedidos: 7,
  ativo: true,
  consentimentoLgpd: true,
}
```

Detail data includes:
- `dataNascimento: '1990-07-15'`
- Array of addresses (1 item, marked principal)
- Array of 7 orders with varying statuses & amounts

---

## MIGRATION CHECKLIST

- [ ] Remove mock data dependency; call `GET /customers` endpoint
- [ ] Remove local filtering logic; use QueryCustomerDto params for server-side filtering
- [ ] Rename camelCase fields to snake_case from API response
- [ ] Handle `totalGastoCentavos` & `totalPedidos` as computed/fetched from Venda API
- [ ] Handle `cidade` & `uf` from separate address records (not top-level Customer fields)
- [ ] Ensure CPF/CNPJ masking logic works with API response (never plaintext in list view)
- [ ] Test pagination with limit + page params
- [ ] Test export flow: GET /customers/:id/export for decrypted PII (LGPD compliance)
- [ ] Remove cpfCnpjMascarado helper; implement on frontend from API data
- [ ] Verify audit logging works (read/update/delete actions)
