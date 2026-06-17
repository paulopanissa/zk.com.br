# 8. Centro de Custo

**Domínio:** Comercial & Precificação
**Prioridade:** P0
**Path NestJS:** `apps/api/src/modules/cost-center/`

---

## Responsabilidade

Registrar e manter os itens de custo fixo e variável que compõem o custo operacional unitário de um produto, alimentando obrigatoriamente o módulo de Engine de Precificação (módulo 9).

---

## Entidades

### CostCenter

Agrupa custos por categoria para organização e reuso.

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| unidade_id | uuid | FK → Unidade; escopo obrigatório |
| nome | varchar(120) | Único por unidade; ex: "Logística Varejo" |
| descricao | text | Opcional |
| ativo | boolean | Default true |
| created_at | timestamptz | Gerenciado pelo ORM |
| updated_at | timestamptz | Gerenciado pelo ORM |

### CostItem

Item individual de custo. Cada item pertence a um CostCenter.

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| cost_center_id | uuid | FK → CostCenter |
| unidade_id | uuid | FK → Unidade; desnormalizado para escopo direto |
| nome | varchar(120) | Ex: "Sacola", "Frete unitário", "Etiqueta" |
| tipo | enum | `FIXO` ou `VARIAVEL` |
| valor_centavos | integer | Valor em centavos; **nunca float**; obrigatório quando tipo = FIXO |
| percentual_bps | integer | Valor em basis points (1% = 100 bps); usado quando tipo = VARIAVEL; mutuamente exclusivo com valor_centavos |
| descricao | text | Opcional |
| ativo | boolean | Default true |
| created_at | timestamptz | Gerenciado pelo ORM |
| updated_at | timestamptz | Gerenciado pelo ORM |

> **Nota de modelagem:** `valor_centavos` e `percentual_bps` são mutuamente exclusivos por tipo. A constraint de banco deve garantir que exatamente um deles seja não-nulo para o tipo correspondente.

---

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| GET | `/cost-centers` | JWT + RBAC (admin) | Lista centros de custo (paginado, filtrável por ativo) |
| POST | `/cost-centers` | JWT + RBAC (admin) | Cria centro de custo |
| GET | `/cost-centers/:id` | JWT + RBAC (admin) | Detalha um centro de custo |
| PATCH | `/cost-centers/:id` | JWT + RBAC (admin) | Atualiza centro de custo |
| DELETE | `/cost-centers/:id` | JWT + RBAC (admin) | Desativa centro de custo (soft delete) |
| GET | `/cost-centers/:id/items` | JWT + RBAC (admin) | Lista itens do centro de custo |
| POST | `/cost-centers/:id/items` | JWT + RBAC (admin) | Adiciona item ao centro de custo |
| PATCH | `/cost-centers/:id/items/:itemId` | JWT + RBAC (admin) | Atualiza item |
| DELETE | `/cost-centers/:id/items/:itemId` | JWT + RBAC (admin) | Desativa item (soft delete) |
| GET | `/cost-centers/summary` | JWT + RBAC (admin, pdv) | Retorna custo total consolidado por unidade (usado pelo módulo 9) |

---

## Regras de Negócio

- Todo CostCenter e CostItem é escoped por `unidade_id`, derivado do contexto autenticado — nunca de parâmetro de rota ou query.
- Um centro de custo com itens ativos não pode ser excluído; apenas desativado (soft delete).
- Um item do tipo `FIXO` deve ter `valor_centavos` preenchido e `percentual_bps` nulo.
- Um item do tipo `VARIAVEL` deve ter `percentual_bps` preenchido e `valor_centavos` nulo.
- `valor_centavos` deve ser > 0. `percentual_bps` deve ser > 0.
- O endpoint `/summary` agrega todos os itens ativos da unidade e devolve:
  - soma total em centavos dos itens `FIXO`
  - soma total em basis points dos itens `VARIAVEL`
  - lista de itens individuais (para exibição no simulador de precificação)
- Nomes de CostCenter são únicos por `unidade_id` (case-insensitive via `lower()`).
- Exclusão física é proibida; toda remoção é soft delete (campo `ativo = false`).

---

## Invariantes Críticos

- **Nunca armazenar valor monetário como float.** Todo valor monetário usa `integer` em centavos; percentuais usam basis points (`integer`).
- **Escopo por unidade obrigatório.** Nenhuma query retorna dados de outra unidade.
- **Soft delete exclusivo.** Registros com dependências (usados em cálculos históricos) nunca são removidos fisicamente.

---

## Dependências

- **Upstream (usa):**
  - `Unidades / Lojas` (módulo 15) — para obter `unidade_id` do contexto
  - `Autenticação & Autorização` (módulo 23) — JWT e RBAC

- **Downstream (usado por):**
  - `Engine de Precificação` (módulo 9) — consome o summary de custos unitários
  - `Produtos` (módulo 7) — exibe custos no simulador de margem

---

## Skills Relevantes

- `nestjs-erp-module` — estrutura padrão (sempre)
- `precificacao` — modelagem de valores monetários em centavos e basis points

---

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após alterações, antes de commit/PR

---

## Critérios de Aceite

- [ ] Dado um item `FIXO`, o sistema rejeita `percentual_bps` preenchido e aceita apenas `valor_centavos > 0`.
- [ ] Dado um item `VARIAVEL`, o sistema rejeita `valor_centavos` preenchido e aceita apenas `percentual_bps > 0`.
- [ ] Dado um centro de custo com itens ativos, a tentativa de exclusão retorna erro 422 (Unprocessable Entity).
- [ ] O endpoint `/summary` agrega corretamente apenas itens ativos da unidade autenticada.
- [ ] Nenhum endpoint retorna dados de `unidade_id` diferente do contexto autenticado.
- [ ] Todos os valores monetários persistidos e retornados são inteiros (centavos); nenhum float.
- [ ] Todos os endpoints estão documentados no Swagger com exemplos de request/response.
- [ ] Nome duplicado de CostCenter na mesma unidade retorna erro 409.
