# 15. Unidades / Lojas

**Domínio:** Plataforma & Gestão
**Prioridade:** P0
**Path NestJS:** `apps/api/src/modules/units/`

---

## Responsabilidade

Representar as unidades físicas (matriz e futuras filiais) da empresa, servindo como âncora de escopo para todas as queries de negócio — estoque, caixa, vendas e configurações são sempre filtrados por `unidade_id`.

---

## Entidades

### Unit

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK gerado automaticamente |
| `company_settings_id` | `uuid` | FK → CompanySettings; sempre presente |
| `nome` | `varchar(255)` | Ex: "Matriz", "Loja Centro", "Feira da Semana" |
| `slug` | `varchar(100)` | Gerado a partir do `nome`; único; usado em logs e relatórios |
| `tipo` | `enum('MATRIZ','FILIAL','PONTO_DE_VENDA_MOVEL')` | `MATRIZ` só pode existir uma |
| `cnpj_inscricao` | `varchar(20)` | CNPJ da filial ou inscrição municipal; opcional para filiais |
| `ativa` | `boolean` | Default `true`; desativar em vez de deletar |
| `permite_venda_offline` | `boolean` | Habilita o PDV offline nesta unidade |
| `created_at` | `timestamptz` | Set automático |
| `updated_at` | `timestamptz` | Set automático |

### UnitAddress

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `unit_id` | `uuid` | FK → Unit |
| `logradouro` | `varchar(255)` | Obrigatório |
| `numero` | `varchar(20)` | Obrigatório |
| `complemento` | `varchar(100)` | Opcional |
| `bairro` | `varchar(100)` | Obrigatório |
| `municipio` | `varchar(100)` | Obrigatório |
| `uf` | `char(2)` | Obrigatório |
| `cep` | `varchar(8)` | Apenas dígitos |
| `codigo_ibge` | `varchar(7)` | Usado em documentos fiscais |

### UnitConfig

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `unit_id` | `uuid` | FK → Unit; 1:1 |
| `estoque_proprio` | `boolean` | `true` = estoque independente; `false` = compartilha com MATRIZ |
| `caixa_proprio` | `boolean` | `true` = caixa próprio (fechamento separado) |
| `gateway_pdv_override_id` | `uuid` | FK → PaymentProviderConfig (módulo 16); sobrescreve o gateway padrão do PDV para esta unidade |
| `timezone` | `varchar(50)` | Default `America/Sao_Paulo`; para relatórios de caixa por horário local |

---

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `GET` | `/units` | `JwtAuthGuard` + `Role('admin')` | Lista todas as unidades ativas (paginado) |
| `GET` | `/units/:id` | `JwtAuthGuard` + `Role('admin')` | Retorna uma unidade com endereço e config |
| `POST` | `/units` | `JwtAuthGuard` + `Role('admin')` | Cria nova unidade (apenas uma MATRIZ permitida) |
| `PUT` | `/units/:id` | `JwtAuthGuard` + `Role('admin')` | Atualiza dados da unidade |
| `PATCH` | `/units/:id/deactivate` | `JwtAuthGuard` + `Role('admin')` | Desativa unidade (soft delete) |
| `PUT` | `/units/:id/address` | `JwtAuthGuard` + `Role('admin')` | Cria ou atualiza endereço da unidade |
| `GET` | `/units/:id/config` | `JwtAuthGuard` + `Role('admin')` | Retorna configurações operacionais da unidade |
| `PUT` | `/units/:id/config` | `JwtAuthGuard` + `Role('admin')` | Atualiza configurações operacionais |

---

## Regras de Negócio

- Somente uma unidade com `tipo = MATRIZ` pode existir. Tentativa de criar segunda MATRIZ retorna `409 Conflict`.
- **Go-live:** somente a matriz existe na abertura do sistema. O modelo está pronto para filiais mas a UI de filiais pode ser ocultada até a fase 2.
- Toda query de dados de negócio (estoque, vendas, relatórios, caixa) DEVE incluir `WHERE unidade_id = ?`, sendo o `unidade_id` extraído do contexto autenticado, nunca de parâmetro do cliente.
- `unidade_id` no token JWT do operador é definido no login e não pode ser alterado pelo próprio operador.
- Desativar uma unidade não exclui dados históricos. Vendas e movimentações passadas são preservadas.
- Uma unidade não pode ser desativada se houver caixa aberto ou sessão de PDV ativa nela.
- `estoque_proprio = false` significa que a unidade consulta e baixa do estoque da MATRIZ. Essa lógica é implementada no módulo de Estoque (módulo 5), não aqui.
- O slug é gerado automaticamente (lowercase, sem acentos, hífens em vez de espaços) e único. Pode ser editado pelo admin com validação de unicidade.

---

## Invariantes Críticos

- **Escopo de tenancy.** `unidade_id` é o pilar da separação de dados. Nenhuma query de negócio pode ser executada sem este filtro. A camada de escopo deve ser aplicada no repositório, não no controller.
- **MATRIZ única.** Constraint de banco garante no máximo uma unidade com `tipo = MATRIZ` e `ativa = true`.
- **Unidade não pode sumir.** Soft delete apenas (`ativa = false`). Nunca `DELETE` físico de unidades que já tiveram movimentação.

---

## Dependências

- **Upstream (usa):**
  - Módulo `Configurações da Empresa` (módulo 14) — FK `company_settings_id`; herda dados da empresa
  - Módulo `Config. de Pagamentos` (módulo 16) — override de gateway por unidade via `gateway_pdv_override_id`

- **Downstream (usado por):**
  - Todos os módulos de negócio — filtro por `unidade_id` é universal
  - Módulo `Estoque` (módulo 5) — escopo de saldo por unidade
  - Módulo `PDV` (módulo 11) — sessão de caixa ligada à unidade
  - Módulo `Relatórios` (módulo 21) — agrupamento e filtro por unidade
  - Módulo `Autenticação` (módulo 23) — `unidade_id` é claim do JWT do operador

---

## Skills Relevantes

- `nestjs-erp-module` — sempre, para estrutura do módulo e scoping

---

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após alterações na lógica de escopo; garantir que `unidade_id` está em todas as queries

---

## Critérios de Aceite

- [ ] Tentativa de criar segunda unidade MATRIZ retorna `409 Conflict` com mensagem descritiva.
- [ ] `GET /units` retorna somente unidades ativas por padrão; filtro `?includeInactive=true` retorna todas.
- [ ] Tentativa de desativar unidade com caixa aberto retorna erro descritivo.
- [ ] Queries de negócio em qualquer outro módulo sempre incluem `unidade_id` derivado do contexto autenticado.
- [ ] Um operador não consegue acessar dados de uma unidade diferente da que está no seu token.
- [ ] Todos os endpoints retornam `403` para usuários sem role `admin`.
- [ ] Todos os endpoints documentados no Swagger.
