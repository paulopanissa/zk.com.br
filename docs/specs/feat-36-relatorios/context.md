# Context — Relatórios (Spec 21)

## Motivação
Módulo de relatórios do ERP para dashboards gerenciais. Sem relatórios, administradores não têm visibilidade de vendas, estoque ou clientes.

## Relatórios a implementar

### 1. Vendas (`GET /relatorios/vendas`)
- Filtros: `data_inicio`, `data_fim`, `categoria_id` (opcional)
- Retorno: `receita_bruta_centavos`, `total_descontos_centavos`, `receita_liquida_centavos`, `ticket_medio_centavos`, `total_vendas`, `total_itens_vendidos`
- Breakdown: top 10 produtos por receita

### 2. Estoque (`GET /relatorios/estoque`)
- Posição atual: saldo derivado de `stock_movements` (SUM por produto)
- Alertas: lotes com `validade <= NOW() + threshold_dias` (default 30)
- Filtros: `threshold_dias`, `categoria_id`

### 3. Clientes (`GET /relatorios/clientes`)
- Filtros: `data_inicio`, `data_fim`
- Retorno: `total_clientes_ativos`, `novos_clientes`, `clientes_recorrentes`, `ticket_medio_centavos`
- Top 10 compradores por valor gasto

### 4. Produtos (`GET /relatorios/produtos`)
- Filtros: `data_inicio`, `data_fim`, `ordem` (margem | volume)
- Melhores/piores por margem (basis points)
- Melhores/piores por volume de vendas

## Invariantes

- Todos os valores monetários em centavos (inteiro)
- Margem = Math.round((preco_venda - custo) / preco_venda * 10000) em bps
- Saldo de estoque = SUM(quantity) de stock_movements (positivo = entrada, negativo = saída)
- Tenancy: todas queries filtradas por unidade_id do contexto autenticado
- RBAC: apenas ADMINISTRADOR
- Relatórios sumários síncronos (ok para períodos razoáveis)
- Exportação CSV/grande → enfileirar via RabbitMQ (fora do escopo desta sprint, só estrutura básica)

## Queries chave (Prisma raw para performance)

Saldo de estoque:
```sql
SELECT product_id, SUM(quantity) as saldo
FROM stock_movements
WHERE unidade_id = $unitId
GROUP BY product_id
```

Vendas por período:
```sql
SELECT SUM(vi.unit_price_centavos * vi.quantity) as receita_bruta, ...
FROM venda_items vi
JOIN vendas v ON v.id = vi.venda_id
WHERE v.unidade_id = $unitId
  AND v.status = 'FINALIZADA'
  AND v.created_at BETWEEN $inicio AND $fim
```
