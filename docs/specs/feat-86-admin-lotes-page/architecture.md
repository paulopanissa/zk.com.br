# Arquitetura — Admin Lotes Page (feat-86)

## Visão geral (antes → depois)

**Antes:** `/lotes` no sidebar redireciona silenciosamente para `/` (rota não registrada). O frontend usa mocks de lote embutidos na `EstoquePage` sem integração real com API.

**Depois:** Página `/lotes` independente com listagem paginada e filtros que consome diretamente `GET /lots`. Backend enriquece a resposta com dados do produto (name, sku) via join Prisma.

## Componentes afetados

### Backend (mínimo)
- `apps/api/src/modules/lots/lots.repository.ts` — adicionar `include: { product: true }` em `findAll`, `findByProduct` e `findExpiring` para retornar `product.name` e `product.sku` sem N+1.
- `apps/api/src/modules/lots/lots.repository.ts` — exportar tipo `LotWithProduct`.

### Frontend (principal)
- `apps/admin/src/pages/lotes/LotesPage.tsx` — nova página (componente principal com estado, filtros, paginação, chamada API real).
- `apps/admin/src/pages/lotes/components/LotesTable.tsx` — tabela paginada com colunas: Produto, Lote, Validade, Fabricação, Status, Qtd. Recebida, NF.
- `apps/admin/src/App.tsx` — registrar rota `/lotes`.

## Padrões mantidos/introduzidos

- Chamada API com `axios` via `api` de `@/lib/api` — mesmo padrão de `NotasEntradaPage`.
- `useCallback` + `useEffect` + `load()` para fetch com re-trigger por filtros.
- `useState` para lista, total, page, loading, error, filtros.
- Filter bar `rounded-lg border bg-card p-4 shadow-sm` — mesmo padrão de `EstoquePage`.
- `ToggleChip` inline (não extrai para arquivo separado — seguindo padrão de `EstoquePage`).
- `Badge variant="outline"` com classes de cor para status.
- Paginação com "Anterior" / "Próxima" outline buttons.
- Date rendering: `+ 'T12:00:00'` em date-only strings para evitar UTC-3 day shift.

## Dependências externas

- Nenhuma nova. `lucide-react`, `axios` e UI components já estão presentes.

## Restrições e suposições

- **Sem tela de detalhe** — o issue especifica "Sem tela de detalhe inicialmente — listagem é suficiente para P0".
- **Sem balance na listagem** — evitar N+1. `quantity_received` exibida como "Qtd. Recebida". Status derivado apenas de `expires_at`.
- **Status threshold "crítico"** — sem campo de estoque mínimo por produto disponível, usamos 7 dias para vencer como critério de "vencendo em breve".
- **DELETE oculto** — ação de desativar não entra no P0 (listagem apenas).
- A modificação no repositório backend é backward-compatible: adiciona campos extras à resposta sem quebrar contratos existentes.

## Trade-offs e alternativas consideradas

| Opção | Decisão |
|---|---|
| N+1: buscar produto separado por lote no frontend | Rejeitado — overhead de requisições |
| Cache de produtos no frontend + lookup local | Rejeitado — complexidade desnecessária para P0 |
| Adicionar `include` no repository (backend minor) | Escolhido — zero overhead extra de query, Prisma faz JOIN único |
| Expor balance na listagem via subquery agregada | Adiado — fora do scope P0, impacto de performance requer análise |

## Consequências negativas conhecidas

- Resposta de `GET /lots` aumenta: inclui objeto `product` aninhado. Peso aceitável (name + sku).

## Principais arquivos a criar/editar

| Arquivo | Ação | Motivo |
|---|---|---|
| `apps/api/src/modules/lots/lots.repository.ts` | Editar | Adicionar `include: { product: true }` e exportar `LotWithProduct` |
| `apps/admin/src/pages/lotes/LotesPage.tsx` | Criar | Página principal com filtros e paginação |
| `apps/admin/src/pages/lotes/components/LotesTable.tsx` | Criar | Tabela de lotes |
| `apps/admin/src/App.tsx` | Editar | Registrar rota `/lotes` |
