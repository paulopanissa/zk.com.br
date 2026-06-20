# Pre-PR Report — feat-119: Dashboard integração API real

## Metaspec Review

**Status: 🟢 APROVADO**

| Critério | Resultado |
|---|---|
| Camadas respeitadas | Controller passa `user` → Service; Repository só executa SQL raw. Nenhum pulo de camada. |
| Tenancy isolada | Todos os 3 métodos do repository filtram por `unitId`. `unitId` é resolvido via `tenancy.resolveUnitId(user)` no service, jamais de parâmetro do cliente. |
| Sem lógica de negócio no controller/repository | Controller: só delega. Repository: só SQL. Conversão de bigint, cálculo de ticket_médio e datas ficam no service. |
| Auth guard | `@Roles(SystemRole.ADMINISTRADOR)` presente na nova rota `GET /relatorios/dashboard`. |
| Swagger documentado | `@ApiOperation` com `summary` e `description` presentes. |

**Observação menor (não bloqueante):** `@ApiResponse` ausente na nova rota. As demais rotas do controller também não o usam de forma consistente, então não é regressão — mas o shape de resposta do dashboard é não-trivial e se beneficiaria de documentação explícita do schema.

**Risco de borda revisado:** `hoje` = `serie[serie.length - 1]` e `ontem` = `serie[serie.length - 2]`. O `generate_series` garante sempre 7 linhas (LEFT JOIN), então `makeKpi(undefined)` para `ontem` só ocorreria se a série retornar 0 ou 1 linha — improvável dado o range fixo, mas `makeKpi` já trata `null/undefined` retornando zeros. Seguro.

## Test Coverage

**Status: 🟡 Ausência de testes é risco moderado, não bloqueador**

**Padrão existente no módulo `relatorios`:** nenhum — zero arquivos `.spec.ts`. O único teste na API é `auth.service.spec.ts`. Não há baseline a seguir.

**Cenários críticos para o backend (`RelatoriosService.getDashboard`):**
- `makeKpi` com `total_pedidos = 0`: divisão por zero é protegida por `pedidos > 0 ? ... : 0` — cobrir para garantir `ticket_medio_centavos = 0`.
- `queryEstoqueCriticoCount` retorna array vazio: fallback `estoqueCriticoRows[0]?.count ?? BigInt(0)` deve retornar `0`.
- `toBigIntNumber` com BigInt acima de `Number.MAX_SAFE_INTEGER`: perda silenciosa de precisão — relevante para receita acumulada alta.
- Tenancy: confirmar que nenhuma query vaza dados entre unidades (`unitId` sempre passado, nunca hardcoded).

**Cenários críticos para o frontend (`DashboardPage`):**
- Renderização do `DashboardSkeleton` enquanto `loading = true`.
- Estado de erro com botão "Tentar novamente" quando a API retorna falha.
- Empty states: `top_produtos = []` e `alertas = []` exibem placeholders corretos (não crasham).

**Veredito:** a PR não adiciona lógica de negócio de alto risco (sem estoque, pagamento ou fiscal). É uma migração de mock para API real. A ausência de testes não é bloqueador, mas deve ser endereçada na sprint seguinte com ao menos testes unitários do `RelatoriosService.getDashboard` cobrindo os casos de borda acima.

---

## Code Review

**Status: 🟡 Aprovado com ressalvas**

### Achados

#### 1. [BUG MÉDIO] `VendasChart` marca o último item como "Hoje" pelo índice, não pela data

```ts
label: getDayLabel(d.data, i === dados.length - 1),
```

Se a API retornar um número inesperado de itens (dados parciais, loja nova na primeira semana, divergência de fuso horário servidor/cliente), o último elemento da array pode não corresponder ao dia atual. O correto é comparar `d.data` com `new Date().toISOString().split('T')[0]` ao invés de usar `i === dados.length - 1`.

#### 2. [SEGURANÇA — OK] `$queryRaw` com template literals — sem risco de SQL injection

Prisma parametriza automaticamente todos os valores interpolados em template literals do `$queryRaw`. Os valores `unitId`, `startDate`, `threshold` e `limit` são todos parametrizados de forma segura. Sem problemas.

#### 3. [QUALIDADE] `@ApiResponse` ausente no endpoint do dashboard

`GET /relatorios/dashboard` tem `@ApiOperation` mas não tem `@ApiResponse`. O projeto exige que todo endpoint seja documentado no Swagger (definition of done no CLAUDE.md). O shape de resposta do dashboard é não-trivial e se beneficiaria de documentação explícita, ao menos `@ApiResponse({ status: 200 })` e `@ApiUnauthorizedResponse`. Já apontado no Metaspec Review como menor; confirmado aqui como pendência.

#### 4. [QUALIDADE] `queryEstoqueCriticoCount` usa threshold fixo de 5 unidades

O limiar de "estoque crítico" está hardcoded em 5 unidades no service (`queryEstoqueCriticoCount(unitId, 5)`). O campo de estoque mínimo configurável por produto não é considerado — cada produto pode ter um mínimo diferente. Aceitável como MVP, mas deve ser registrado como débito técnico.

#### 5. [QUALIDADE] `formatBRL` duplicada em 3 arquivos frontend

`DashboardPage.tsx`, `StatusCaixa.tsx` e `TopProdutos.tsx` definem a mesma função `formatBRL`. Deveria ser centralizada em `packages/ui` ou em um utilitário compartilhado do app admin.

### Resumo da Code Review

| Severidade | Item |
|---|---|
| 🟡 Médio | "Hoje" no gráfico por índice posicional, não por data real |
| 🟡 Médio | `@ApiResponse` ausente no endpoint (definition of done) |
| 🟢 Baixo | Threshold de estoque crítico hardcoded (débito técnico OK para MVP) |
| 🟢 Info | `formatBRL` duplicada no frontend |

Sem problemas de SQL injection. Tenancy (`unidade_id`) corretamente propagado via `TenancyService`. RBAC com `@Roles(SystemRole.ADMINISTRADOR)` aplicado. Loading state, skeleton e error boundary com retry implementados corretamente no frontend. Empty states adicionados em `TopProdutos` e `AlertasRecentes`. Tipos alinhados entre backend e frontend.
