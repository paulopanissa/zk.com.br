# Arquitetura — Dashboard integração API real

## Visão geral (antes → depois)

**Antes:** DashboardPage importa 7 constantes do `dashboard.mock.ts`. Zero chamadas de rede.

**Depois:** DashboardPage chama `GET /relatorios/dashboard` e renderiza dados reais com loading skeleton e tratamento de erro. `dashboard.mock.ts` é deletado.

## Componentes afetados

### Backend
- `relatorios.repository.ts` — 2 novos métodos: `queryVendasSerieDiaria`, `queryEstoqueCriticoCount`
- `relatorios.service.ts` — novo método `getDashboard`
- `relatorios.controller.ts` — nova rota `GET /relatorios/dashboard`

### Frontend
- `DashboardPage.tsx` — substitui mock por `useEffect + api`; loading skeleton; error state
- `components/AlertasRecentes.tsx` — mapeia `AlertType` do backend (ESTOQUE_BAIXO, MARGEM_BAIXA, VENDA_FINALIZADA, CUPOM_ESGOTADO)
- `components/StatusCaixa.tsx` — sem módulo de caixa real → "Resumo do dia" com totais de vendas
- `components/TopProdutos.tsx` — adapta shape: `name` (não `nome`), `unidades_vendidas` (não `vendidos`), `receita_centavos` (não `receita`)
- `components/VendasChart.tsx` — adapta shape: `total_centavos` (não `total`), `total_pedidos`
- `data/dashboard.mock.ts` — DELETADO

## Endpoint `/relatorios/dashboard`

```json
{
  "hoje": {
    "total_centavos": 178900,
    "total_pedidos": 8,
    "ticket_medio_centavos": 22362
  },
  "ontem": {
    "total_centavos": 214600,
    "total_pedidos": 11,
    "ticket_medio_centavos": 19509
  },
  "serie_7_dias": [
    { "data": "2026-06-14", "label": "Dom", "total_centavos": 452300, "total_pedidos": 24 }
  ],
  "top_produtos": [
    { "id": "...", "name": "Mordedor Osso", "sku": "MOR-001", "unidades_vendidas": 24, "receita_centavos": 155760 }
  ],
  "estoque_critico_count": 3,
  "alertas": [
    { "id": "...", "tipo": "ESTOQUE_BAIXO", "mensagem": "...", "criado_em": "2026-06-17T10:23:00Z" }
  ]
}
```

## Decisões

1. **Endpoint agregado**: 1 chamada no lugar de 5 (vendas hoje, vendas ontem, série, alertas, estoque) — evita waterfall e simplifica o component
2. **Estoque crítico count**: query direta em `stock_movements` agregada por produto, filtrando `saldo_atual > 0 AND saldo_atual <= 5`. Sem modelo de "estoque mínimo" por produto — 5 é threshold fixo razoável para pet shop.
3. **StatusCaixa → Resumo do dia**: sem módulo de caixa real. Widget reaproveitado como resumo de vendas do dia (total, pedidos, ticket). Label updated para "Vendas do dia".
4. **AlertType sem `lido`**: backend não tem campo `lido` em alert_events. Frontend remove indicador de não-lido. Mostra últimos 5 eventos.

## Principais arquivos

- `apps/api/src/modules/relatorios/relatorios.repository.ts` — +2 métodos
- `apps/api/src/modules/relatorios/relatorios.service.ts` — +1 método
- `apps/api/src/modules/relatorios/relatorios.controller.ts` — +1 rota
- `apps/admin/src/pages/dashboard/DashboardPage.tsx` — rewrite
- `apps/admin/src/pages/dashboard/components/AlertasRecentes.tsx` — fix enum
- `apps/admin/src/pages/dashboard/components/StatusCaixa.tsx` — adapt
- `apps/admin/src/pages/dashboard/components/TopProdutos.tsx` — adapt shape
- `apps/admin/src/pages/dashboard/components/VendasChart.tsx` — adapt shape
- `apps/admin/src/data/dashboard.mock.ts` — DELETE
