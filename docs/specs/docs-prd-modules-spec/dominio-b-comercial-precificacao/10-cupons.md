# 10. Cupons

**Domínio:** Comercial & Precificação
**Prioridade:** P1
**Path NestJS:** `apps/api/src/modules/coupons/`

---

## Responsabilidade

Gerenciar cupons de desconto aplicáveis em vendas (PDV e e-commerce), suportando desconto em valor fixo (R$), desconto percentual (%), frete grátis e restrição por produto — com idempotência na aplicação para evitar dupla dedução.

---

## Entidades

### Coupon

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| unidade_id | uuid | FK → Unidade; escopo obrigatório |
| codigo | varchar(50) | Único por unidade; case-insensitive; armazenado em uppercase |
| descricao | text | Opcional; exibido ao operador |
| tipo | enum | `VALOR_FIXO`, `PERCENTUAL`, `FRETE_GRATIS` |
| valor_centavos | integer | Valor em centavos; obrigatório quando tipo = `VALOR_FIXO`; > 0 |
| percentual_bps | integer | Em basis points; obrigatório quando tipo = `PERCENTUAL`; > 0 e <= 10000 |
| aplicacao | enum | `CARRINHO` (total da venda) ou `PRODUTO` |
| produto_id | uuid | FK → Produto; obrigatório quando aplicacao = `PRODUTO`; nulo caso contrário |
| uso_minimo_centavos | integer | Valor mínimo de compra para aplicação; >= 0; default 0 |
| limite_uso_total | integer | Máximo de utilizações totais; null = ilimitado |
| limite_uso_por_cliente | integer | Máximo de utilizações por cliente; null = ilimitado |
| valido_de | timestamptz | Início da validade; null = sem início restrito |
| valido_ate | timestamptz | Fim da validade; null = sem expiração |
| ativo | boolean | Default true |
| created_at | timestamptz | Gerenciado pelo ORM |
| updated_at | timestamptz | Gerenciado pelo ORM |

### CouponUsage

Registro de cada utilização de um cupom. Garante idempotência e controle de limites.

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| coupon_id | uuid | FK → Coupon |
| venda_id | uuid | FK → Venda (PDV) ou Pedido (e-commerce); identificador externo |
| canal | enum | `PDV` ou `ECOMMERCE` |
| cliente_id | uuid | FK → Cliente; nulo para venda anônima no PDV |
| desconto_aplicado_centavos | integer | Valor efetivamente descontado na venda; calculado e persistido no momento da aplicação |
| applied_at | timestamptz | Momento da aplicação |

> **Índice único em `(coupon_id, venda_id)`** — garante que um cupom seja aplicado no máximo uma vez por venda (idempotência).

---

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| GET | `/coupons` | JWT + RBAC (admin) | Lista cupons (paginado; filtros: ativo, tipo, codigo) |
| POST | `/coupons` | JWT + RBAC (admin) | Cria novo cupom |
| GET | `/coupons/:id` | JWT + RBAC (admin) | Detalha cupom com contagem de usos |
| PATCH | `/coupons/:id` | JWT + RBAC (admin) | Atualiza cupom (não altera usos já registrados) |
| DELETE | `/coupons/:id` | JWT + RBAC (admin) | Desativa cupom (soft delete) |
| POST | `/coupons/validate` | JWT + RBAC (admin, pdv) | Valida e retorna o desconto calculado para um cupom + contexto de venda (não persiste uso) |
| POST | `/coupons/apply` | JWT + RBAC (admin, pdv) | Aplica o cupom numa venda — persiste CouponUsage; idempotente por `(coupon_id, venda_id)` |
| GET | `/coupons/:id/usages` | JWT + RBAC (admin) | Lista utilizações de um cupom (paginado) |

---

## Regras de Negócio

- O código do cupom é armazenado em uppercase; a validação é case-insensitive.
- Um cupom do tipo `VALOR_FIXO` não pode descontar mais do que o valor total da venda; o desconto é limitado ao total.
- Um cupom do tipo `PERCENTUAL` com `percentual_bps = 10000` representa 100% de desconto (item de graça); permitido mas requer confirmação explícita no DTO.
- Um cupom do tipo `FRETE_GRATIS` zera o valor do frete cobrado na venda; no PDV (sem frete) é sem efeito e retorna aviso na validação.
- Um cupom com `aplicacao = PRODUTO` só pode ser aplicado se o produto especificado (`produto_id`) estiver presente no carrinho; caso contrário, retornar erro de negócio.
- `valido_ate` anterior ao momento da requisição invalida o cupom.
- `limite_uso_total` atingido invalida o cupom (verificar com `SELECT COUNT(*) FROM coupon_usage WHERE coupon_id = ?`).
- `limite_uso_por_cliente` é verificado apenas quando `cliente_id` não é nulo.
- O endpoint `/validate` retorna o desconto calculado mas **não** persiste `CouponUsage` — permite pré-visualização no frontend sem efeitos colaterais.
- O endpoint `/apply` é idempotente: se `(coupon_id, venda_id)` já existe em `CouponUsage`, retorna o registro existente sem erro e sem duplicar a dedução.
- Desconto calculado pelo `/apply` deve ser idêntico ao calculado pelo `/validate` com os mesmos inputs.
- Toda venda que usar cupom registra `desconto_aplicado_centavos` no `CouponUsage` para auditoria e relatórios.

---

## Invariantes Críticos

- **Idempotência obrigatória.** O índice único `(coupon_id, venda_id)` na tabela `CouponUsage` impede aplicação duplicada. A camada de serviço deve tratar a exceção de unique violation e retornar o registro existente.
- **Nunca float.** Todos os valores monetários são inteiros em centavos; percentuais em basis points.
- **Desconto nunca excede o total.** O valor descontado é `min(desconto_calculado, total_venda)` — nunca gera total negativo.
- **Escopo por unidade obrigatório.** Nenhuma query retorna cupons de outra unidade.

---

## Dependências

- **Upstream (usa):**
  - `Produtos` (módulo 7) — para validar `produto_id` em cupons de produto
  - `Unidades / Lojas` (módulo 15) — escopo de `unidade_id`
  - `Autenticação & Autorização` (módulo 23) — JWT e RBAC

- **Downstream (usado por):**
  - `PDV` (módulo 11) — aplica cupons no checkout
  - `E-commerce` (módulo 13, P2) — aplica cupons no checkout online

---

## Skills Relevantes

- `nestjs-erp-module` — estrutura padrão (sempre)
- `precificacao` — modelagem de desconto em centavos e basis points

---

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após alterações, antes de commit/PR
- `escritor-de-testes` — cobertura de idempotência, limites de uso e cálculo de desconto

---

## Critérios de Aceite

- [ ] Dado um cupom `VALOR_FIXO` de R$ 10,00 aplicado em venda de R$ 8,00, o desconto efetivo é R$ 8,00 (não R$ 10,00).
- [ ] Dado um cupom com `limite_uso_total = 1` já utilizado, a tentativa de aplicação retorna erro de negócio.
- [ ] Dado um cupom com `valido_ate` no passado, a validação retorna erro de negócio.
- [ ] A chamada duplicada de `/apply` com o mesmo `(coupon_id, venda_id)` retorna HTTP 200 com o registro existente, sem criar novo `CouponUsage`.
- [ ] Cupom `FRETE_GRATIS` no PDV retorna aviso "frete não aplicável no PDV" na validação, sem erro.
- [ ] Cupom `PRODUTO` com produto ausente do carrinho retorna erro de negócio 422.
- [ ] Código de cupom "PROMO10" e "promo10" referenciam o mesmo cupom (case-insensitive).
- [ ] Todos os valores persistidos em `desconto_aplicado_centavos` são inteiros; nenhum float.
- [ ] Todos os endpoints documentados no Swagger.
- [ ] Nenhum endpoint retorna dados de `unidade_id` diferente do contexto autenticado.
