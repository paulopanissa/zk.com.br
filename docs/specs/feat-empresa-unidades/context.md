# Context: Empresa (módulo 14) + Unidades/Lojas (módulo 15)

**Domínio:** Plataforma & Gestão | **Prioridade:** P0  
**Paths NestJS:** `apps/api/src/modules/company-settings/` e `apps/api/src/modules/units/`

---

## Entidades e Campos Principais

### CompanySettings (singleton — exatamente 1 registro)
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | uuid | PK |
| `razao_social` | varchar(255) | Obrigatório |
| `nome_fantasia` | varchar(255) | Opcional |
| `cnpj_cpf` | varchar(14) | Só dígitos; único; validado por dígito verificador |
| `tipo_documento` | enum(CNPJ, CPF) | Explícito |
| `inscricao_estadual` | varchar(20) | Opcional, só dígitos |
| `regime_tributario` | enum(SIMPLES, LUCRO_PRESUMIDO, LUCRO_REAL) | Obrigatório; alimenta engine fiscal |
| `logo_url` | varchar(500) | URL no S3/R2; upload via módulo Storage |
| `dpo_email` | varchar(255) | Obrigatório para conformidade LGPD |

### CompanyEmail
Tipos: `COMERCIAL`, `FINANCEIRO`, `SUPORTE`, `NFE`, `DPO`, `OUTRO`. Um `principal = true` por empresa. Ao menos um com `tipo = DPO` deve existir sempre.

### CompanyPhone
Tipos: `COMERCIAL`, `FINANCEIRO`, `SUPORTE`, `WHATSAPP`, `OUTRO`. Um `principal = true` por empresa. `ddi` default `+55`; `numero` só dígitos.

### CompanyAddress
Tipos: `MATRIZ`, `CORRESPONDENCIA`, `COBRANCA`. Endereço de MATRIZ deve existir sempre. Filiais são tratadas no módulo 15.

---

### Unit
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | uuid | PK |
| `company_settings_id` | uuid | FK → CompanySettings |
| `nome` | varchar(255) | Ex: "Matriz", "Loja Centro" |
| `slug` | varchar(100) | Auto-gerado; único |
| `tipo` | enum(MATRIZ, FILIAL, PONTO_DE_VENDA_MOVEL) | Só uma MATRIZ permitida |
| `cnpj_inscricao` | varchar(20) | CNPJ da filial; opcional |
| `ativa` | boolean | Default true; soft delete apenas |
| `permite_venda_offline` | boolean | Habilita PDV offline nesta unidade |

### UnitAddress
Endereço físico da unidade: logradouro, numero, bairro, municipio, uf, cep (só dígitos), codigo_ibge.

### UnitConfig (1:1 com Unit)
| Campo | Notas |
|-------|-------|
| `estoque_proprio` | `false` = compartilha estoque da MATRIZ |
| `caixa_proprio` | `true` = fechamento de caixa separado |
| `gateway_pdv_override_id` | FK → PaymentProviderConfig; sobrescreve gateway padrão |
| `timezone` | Default `America/Sao_Paulo` |

---

## Endpoints

### CompanySettings — 15 endpoints (todos `JwtAuthGuard + Role('admin')`)
| Método | Rota |
|--------|------|
| GET / PUT | `/company-settings` (upsert singleton) |
| GET / POST / PUT /:id / DELETE /:id | `/company-settings/emails` |
| GET / POST / PUT /:id / DELETE /:id | `/company-settings/phones` |
| GET / POST / PUT /:id / DELETE /:id | `/company-settings/addresses` |
| POST | `/company-settings/logo` |

### Units — 8 endpoints (todos `JwtAuthGuard + Role('admin')`)
| Método | Rota |
|--------|------|
| GET | `/units` (paginado; `?includeInactive=true` para inativas) |
| GET | `/units/:id` |
| POST | `/units` |
| PUT | `/units/:id` |
| PATCH | `/units/:id/deactivate` |
| PUT | `/units/:id/address` |
| GET / PUT | `/units/:id/config` |

**Total: 23 endpoints**

---

## Regras de Negócio

**Empresa:**
- `CompanySettings` é singleton; `PUT /company-settings` faz upsert. Sem `POST` nem `DELETE` no recurso raiz.
- CNPJ validado pelos dois dígitos verificadores (módulo 11); CPF idem. Rejeitar com `422` se inválido.
- Armazenar CNPJ/CPF sem formatação; formatar apenas na saída.
- Não permitir remover o único e-mail DPO nem o único endereço MATRIZ.
- `regime_tributario` alimenta o módulo de Config. de Impostos (módulo 18).
- Upload de logo delegado ao módulo Storage (módulo 25); só armazena a URL.

**Unidades:**
- Apenas uma unidade com `tipo = MATRIZ` pode existir (`409 Conflict` se tentar criar segunda).
- `unidade_id` no token JWT do operador é imutável pelo próprio operador.
- Desativar unidade: soft delete (`ativa = false`). Dados históricos preservados.
- Não desativar unidade com caixa aberto ou sessão PDV ativa.
- `estoque_proprio = false`: lógica de compartilhamento implementada no módulo Estoque (módulo 5).
- Slug gerado automaticamente (lowercase, sem acentos, hífens); editável com validação de unicidade.

---

## Invariantes Críticos

1. **CNPJ/CPF validado por dígito antes de qualquer INSERT/UPDATE.** Nunca persistir sem validação.
2. **Escopo de tenancy via `unidade_id`.** Toda query de negócio (estoque, vendas, caixa, relatórios) filtra por `unidade_id` extraído do contexto autenticado — nunca de parâmetro do cliente. Implementado no repositório, não no controller.
3. **Singleton de empresa + MATRIZ única de unidade.** `CompanySettings` tem exatamente 1 linha; `Unit` tem no máximo 1 com `tipo = MATRIZ` e `ativa = true`. Ambos garantidos por constraint de banco.
4. **PII em repouso:** `cnpj_cpf`, `dpo_email` e contatos são PII empresarial — criptografar conforme `seguranca-lgpd`. DPO sempre presente (exigência LGPD).
5. **Soft delete apenas em unidades.** Nunca `DELETE` físico de unidade com movimentação histórica.

---

## Dependências

### Módulo 14 — CompanySettings
- **Upstream:** Storage (módulo 25) para logo; skills `fiscal-br` e `seguranca-lgpd`.
- **Downstream:** Unidades (módulo 15), Config. de Impostos (módulo 18), LGPD (módulo 22), Integração Fiscal (módulo 26), Notificações (módulo 20).

### Módulo 15 — Units
- **Upstream:** CompanySettings (módulo 14) via FK; Config. de Pagamentos (módulo 16) para override de gateway.
- **Downstream:** **todos os módulos de negócio** (filtro universal por `unidade_id`), Estoque (módulo 5), PDV (módulo 11), Relatórios (módulo 21), Autenticação (módulo 23).

---

## Critérios de Aceite

**Empresa:**
- CNPJ/CPF inválido → `422` com mensagem descritiva.
- CNPJ/CPF persistido sem formatação; retornado formatado na resposta.
- Remoção do único endereço MATRIZ → erro descritivo.
- Remoção do único e-mail DPO → erro descritivo.
- Upload de logo salva URL, não binário no banco.
- Todos os endpoints retornam `403` sem role `admin` e documentados no Swagger.

**Unidades:**
- Segunda unidade MATRIZ → `409 Conflict`.
- `GET /units` retorna só ativas por padrão; `?includeInactive=true` retorna todas.
- Desativar unidade com caixa aberto → erro descritivo.
- Operador não acessa dados de unidade diferente da que está no seu token.
- Queries de negócio sempre incluem `unidade_id` do contexto autenticado.
- Todos os endpoints retornam `403` sem role `admin` e documentados no Swagger.
