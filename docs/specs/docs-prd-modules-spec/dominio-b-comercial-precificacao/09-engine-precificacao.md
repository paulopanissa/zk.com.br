# 9. Engine de Precificação

**Domínio:** Comercial & Precificação
**Prioridade:** P0
**Path NestJS:** `apps/api/src/modules/pricing-engine/`

---

## Responsabilidade

Fornecer um serviço de cálculo puro e reutilizável que, dado um conjunto de insumos (custo de compra, impostos, frete, centro de custo e taxa de cartão), retorna o preço sugerido, a margem em R$ e a margem percentual — sem persistir o resultado.

> **Este módulo não é um CRUD.** Não há entidade persistida de "resultado de precificação". O cálculo acontece em memória a cada chamada. O `PricingEngineService` é um helper injetável consumido por outros módulos (Produtos, PDV, calculadora avulsa).

---

## Entidades

Não há entidade persistida neste módulo.

### PricingInput (DTO / estrutura de dados)

Representa os insumos do cálculo. Todos os valores monetários são inteiros em centavos; percentuais em basis points (1% = 100 bps).

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| preco_custo_centavos | integer | Custo de compra do produto; obrigatório; > 0 |
| impostos_bps | integer | Soma de impostos incidentes (ICMS, PIS, COFINS etc.); >= 0; default 0 |
| frete_centavos | integer | Frete unitário de entrada; >= 0; default 0 |
| custo_operacional_centavos | integer | Soma dos itens fixos do Centro de Custo; >= 0; default 0 |
| custo_operacional_variavel_bps | integer | Soma dos itens variáveis do Centro de Custo em bps; >= 0; default 0 |
| taxa_cartao_bps | integer | Taxa do gateway/maquininha aplicável à venda; >= 0; default 0 |
| margem_desejada_bps | integer | Margem mínima desejada em bps; >= 0; default 0; quando fornecida, o preço sugerido a respeita |

### PricingResult (DTO de resposta)

| Campo | Tipo | Notas |
|-------|------|-------|
| custo_total_centavos | integer | Soma de todos os custos antes da margem |
| preco_sugerido_centavos | integer | Preço de venda que cobre todos os custos + margem desejada |
| margem_reais_centavos | integer | `preco_sugerido - custo_total` em centavos |
| margem_percentual_bps | integer | Margem percentual em basis points |
| breakdown | object | Detalhamento por componente (para exibição no simulador) |

---

## Fórmula de Cálculo

Todos os valores são inteiros em centavos. **Nunca use float em nenhuma etapa intermediária.**

```
custo_base = preco_custo_centavos + frete_centavos + custo_operacional_centavos

// Percentuais aplicados sobre custo_base (arredondamento para baixo em cada passo)
custo_impostos = floor(custo_base * impostos_bps / 10000)
custo_operacional_var = floor(custo_base * custo_operacional_variavel_bps / 10000)
custo_cartao = floor(custo_base * taxa_cartao_bps / 10000)

custo_total = custo_base + custo_impostos + custo_operacional_var + custo_cartao

// Preço sugerido para cobrir custo_total com margem desejada
// Se margem_desejada_bps = 0, preco_sugerido = custo_total
preco_sugerido = ceil(custo_total * 10000 / (10000 - margem_desejada_bps))

margem_reais = preco_sugerido - custo_total
margem_percentual_bps = floor(margem_reais * 10000 / preco_sugerido)
```

> **Regra de arredondamento:** Use `Math.floor` para custoss intermediários (conservador) e `Math.ceil` para o preço sugerido (garante cobertura de custo). Nunca use `Math.round` em valores monetários.

---

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| POST | `/pricing-engine/calculate` | JWT + RBAC (admin, pdv) | Calcula preço sugerido e margem a partir dos insumos fornecidos (calculadora avulsa) |

> O `PricingEngineService` é injetado diretamente nos módulos `Produtos` (módulo 7) e `PDV` (módulo 11) para cálculo embutido — sem passar pela rota HTTP nesses contextos.

---

## Regras de Negócio

- O cálculo é **stateless**: nenhum resultado é persistido. O histórico de precificação (quando necessário) é responsabilidade do módulo consumidor (ex: o campo `preco_venda` no Produto).
- Todos os campos de entrada com default 0 são opcionais no DTO; a engine opera parcialmente (ex: só custo + margem, sem impostos).
- `margem_desejada_bps` deve ser < 10000 (< 100%); caso contrário a divisão resulta em preço inválido — retornar erro 422.
- `preco_custo_centavos` é o único campo obrigatório sem default.
- O breakdown no resultado deve conter cada componente individualmente para exibição no simulador de margem do Produto e da calculadora avulsa.
- O módulo **não** acessa o banco de dados diretamente. Os dados de impostos, Centro de Custo e taxa de cartão são fornecidos pelo chamador (pré-carregados por quem invoca o serviço).

---

## Invariantes Críticos

- **Nunca usar float.** Todo cálculo usa aritmética inteira. Divisões usam `Math.floor` ou `Math.ceil` conforme a regra acima.
- **Sem persistência de resultado.** A engine é um serviço puro de cálculo; resultados não são gravados por este módulo.
- **Sem acesso direto ao banco.** O `PricingEngineService` não injeta Repository — todos os insumos vêm dos parâmetros de entrada.
- **margem_desejada_bps < 10000** sempre; qualquer valor >= 10000 deve ser rejeitado antes do cálculo.

---

## Dependências

- **Upstream (usa):**
  - `Centro de Custo` (módulo 8) — o chamador pré-carrega o summary de custos antes de invocar a engine
  - `Configuração de Impostos` (módulo 18) — o chamador pré-carrega as alíquotas
  - `Configuração de Pagamentos` (módulo 16) — o chamador pré-carrega a taxa do gateway/método
  - `Autenticação & Autorização` (módulo 23) — JWT e RBAC para o endpoint HTTP

- **Downstream (usado por):**
  - `Produtos` (módulo 7) — simulador de margem na aba de precificação do produto
  - `PDV` (módulo 11) — exibição de margem no checkout (opcional/admin)
  - Calculadora avulsa via endpoint `/pricing-engine/calculate`

---

## Skills Relevantes

- `nestjs-erp-module` — estrutura padrão (sempre)
- `precificacao` — fórmula de margem, aritmética inteira em centavos/bps

---

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após alterações, antes de commit/PR
- `escritor-de-testes` — obrigatório: lógica financeira exige cobertura de casos extremos (margem 0%, valores mínimos, arredondamento)

---

## Critérios de Aceite

- [ ] Dado custo_custo=10000 centavos, impostos=1800 bps, frete=200 centavos, custo_operacional_fixo=50 centavos, taxa_cartao=250 bps, margem_desejada=3000 bps, o resultado retornado é determinístico e calculado inteiramente com aritmética inteira.
- [ ] Nenhum float aparece em nenhuma etapa do cálculo (verificável via testes unitários com valores que causariam arredondamento errôneo em float).
- [ ] `margem_desejada_bps = 9999` é aceito; `margem_desejada_bps = 10000` retorna HTTP 422.
- [ ] `preco_custo_centavos` ausente ou <= 0 retorna HTTP 400.
- [ ] Todos os campos opcionais omitidos resultam em cálculo válido (tratados como 0).
- [ ] O breakdown da resposta contém todos os componentes individuais com seus valores em centavos/bps.
- [ ] O `PricingEngineService` não tem `@InjectRepository` nem acessa o banco diretamente (verificável na implementação).
- [ ] Endpoint documentado no Swagger com exemplo completo de request/response.
- [ ] Testes unitários cobrem: margem 0%, margem máxima (9999 bps), frete 0, custo operacional 0, todos os campos preenchidos.
