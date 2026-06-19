# API Contract — Units Module

Auth: Bearer token obrigatório em todos os endpoints. Role: `ADMINISTRADOR`.

---

## Endpoints

| Método | Path | Body DTO | Query Params |
|--------|------|----------|--------------|
| GET | `/units` | — | `includeInactive?: boolean` |
| GET | `/units/:id` | — | — |
| POST | `/units` | `CreateUnitDto` | — |
| PUT | `/units/:id` | `UpdateUnitDto` | — |
| PATCH | `/units/:id/deactivate` | — | — → 204 No Content |
| PUT | `/units/:id/address` | `UpsertUnitAddressDto` | — |
| GET | `/units/:id/config` | — | — |
| PUT | `/units/:id/config` | `UpdateUnitConfigDto` | — |

---

## DTOs de entrada

### CreateUnitDto
| Campo | Tipo | Obrigatório | Regra |
|-------|------|-------------|-------|
| `nome` | string | Sim | — |
| `tipo` | `TipoUnidade` enum | Sim | MATRIZ ou FILIAL; apenas uma MATRIZ ativa permitida |
| `cnpj_inscricao` | string | Não | Apenas dígitos; se 14 dígitos, valida dígito verificador do CNPJ |
| `permite_venda_offline` | boolean | Não | default `false` |

### UpdateUnitDto (extends PartialType de CreateUnitDto — todos opcionais)
Todos os campos de `CreateUnitDto` mais:
| Campo | Tipo | Obrigatório | Regra |
|-------|------|-------------|-------|
| `slug` | string | Não | Apenas `[a-z0-9-]`; unicidade verificada |

### UpsertUnitAddressDto
| Campo | Tipo | Obrigatório | Regra |
|-------|------|-------------|-------|
| `logradouro` | string | Sim | — |
| `numero` | string | Sim | — |
| `complemento` | string | Não | — |
| `bairro` | string | Sim | — |
| `municipio` | string | Sim | — |
| `uf` | string | Sim | 2 letras maiúsculas (ex: `SP`) |
| `cep` | string | Sim | Exatamente 8 dígitos |
| `codigo_ibge` | string | Não | — |

### UpdateUnitConfigDto (todos opcionais)
| Campo | Tipo | Regra |
|-------|------|-------|
| `estoque_proprio` | boolean | default `true` |
| `caixa_proprio` | boolean | default `true` |
| `gateway_pdv_override_id` | UUID string | Sobrescreve gateway global |
| `timezone` | string | IANA timezone; default `America/Sao_Paulo` |

---

## Shape das respostas

### GET `/units` — array de `UnitWithRelations`
```json
[
  {
    "id": "uuid",
    "company_settings_id": "uuid",
    "nome": "string",
    "slug": "string",
    "tipo": "MATRIZ | FILIAL",
    "cnpj_inscricao": "string | null",
    "ativa": true,
    "permite_venda_offline": false,
    "created_at": "ISO datetime",
    "updated_at": "ISO datetime",
    "address": {
      "id": "uuid",
      "unit_id": "uuid",
      "logradouro": "string",
      "numero": "string",
      "complemento": "string | null",
      "bairro": "string",
      "municipio": "string",
      "uf": "SP",
      "cep": "01310100",
      "codigo_ibge": "string | null"
    },
    "config": {
      "id": "uuid",
      "unit_id": "uuid",
      "estoque_proprio": true,
      "caixa_proprio": true,
      "gateway_pdv_override_id": "uuid | null",
      "timezone": "America/Sao_Paulo"
    }
  }
]
```
Sem paginação — retorna array completo. Ordenado por `created_at asc`. Filtrado por `ativa = true` por padrão (use `includeInactive=true` para incluir inativas).

### GET `/units/:id` — `UnitWithRelations`
Mesmo shape de um item do array acima.

### POST `/units` — `UnitWithRelations` (item criado, com `address: null` e `config` com defaults)

### PUT `/units/:id` — `UnitWithRelations` atualizado

### PATCH `/units/:id/deactivate` — 204 No Content (sem body)

### PUT `/units/:id/address` — `UnitAddress`
```json
{
  "id": "uuid",
  "unit_id": "uuid",
  "logradouro": "string",
  "numero": "string",
  "complemento": "string | null",
  "bairro": "string",
  "municipio": "string",
  "uf": "SP",
  "cep": "01310100",
  "codigo_ibge": "string | null"
}
```

### GET `/units/:id/config` e PUT `/units/:id/config` — `UnitConfig`
```json
{
  "id": "uuid",
  "unit_id": "uuid",
  "estoque_proprio": true,
  "caixa_proprio": true,
  "gateway_pdv_override_id": "uuid | null",
  "timezone": "America/Sao_Paulo"
}
```

---

## Erros notáveis
- `409 Conflict` ao tentar criar/promover segunda MATRIZ ativa
- `409 Conflict` ao usar slug já existente em outra unidade
- `409 Conflict` ao desativar unidade MATRIZ
- `404 Not Found` se unidade ou config não existir
- `422 Unprocessable Entity` se CNPJ com 14 dígitos tiver dígito verificador inválido
