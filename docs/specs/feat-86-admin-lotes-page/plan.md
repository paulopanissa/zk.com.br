# Admin Lotes Page (feat-86)

Se retomando este trabalho, atualize este arquivo conforme progride.

## FASE 1 — Backend: enriquecer resposta com dados do produto [Completada ✅]

Modificar `lots.repository.ts` para incluir `product` (name + sku) nos métodos de listagem.

### Tarefa A — Atualizar tipo `LotRecord` e `findAll` [Não Iniciada ⏳]
- Exportar `LotWithProduct = Lot & { product: { id: string; name: string; sku: string | null } }`
- Adicionar `include: { product: { select: { id: true, name: true, sku: true } } }` em `findAll`, `findByProduct`, `findExpiring`
- Atualizar assinaturas de retorno no service e controller conforme necessário

### Testes desta fase
- [ ] `GET /lots` retorna objeto `product` com `id`, `name`, `sku` em cada lote
- [ ] Tipos TypeScript compilam sem erros

## FASE 2 — Frontend: LotesPage e LotesTable [Completada ✅]

Criar a página `/lotes` com listagem real da API.

### Tarefa A — Criar `LotesTable.tsx` [Não Iniciada ⏳]
- Colunas: Produto (name + sku), Lote (code, font-mono), Validade, Fabricação, Status (badge), Qtd. Recebida, NF (invoice_item_id truncado)
- Status derivado de `expires_at`: vencido / vencendo (≤30d) / válido / sem validade
- Date UTC-3 fix: `+ 'T12:00:00'`
- Zebra rows, inactive rows `opacity-50`
- Paginação com "Anterior" / "Próxima"

### Tarefa B — Criar `LotesPage.tsx` [Não Iniciada ⏳]
- State: `lots`, `total`, `page`, `loading`, `error`
- Filtros: `busca` (code), `status` (chip toggle: todos/vencendo/vencido/válido), `active` toggle
- `load()` com `useCallback` + `useEffect`
- Header com contagens (críticos, vencidos)
- Filter bar com search input + ToggleChip + "Limpar"
- Sem sheet de detalhe (P0)

### Testes desta fase
- [ ] Página renderiza sem erros com dados reais da API
- [ ] Busca por código filtra corretamente (via query param `code`)
- [ ] Filtro por status atualiza os chips e exibe apenas lotes do status selecionado
- [ ] Paginação avança e volta corretamente
- [ ] Linhas de lotes inativos têm `opacity-50`

## FASE 3 — Routing e integração final [Completada ✅]

### Tarefa A — Registrar rota em App.tsx [Não Iniciada ⏳]
- Import `LotesPage`
- Adicionar `<Route path="/lotes" element={<LotesPage />} />` antes do catch-all

### Testes desta fase
- [ ] Navegar para `/lotes` no browser carrega a página
- [ ] Link "Lotes" no sidebar acende corretamente (estado ativo)
- [ ] Sidebar já tem `/lotes` — confirmar que navegar funciona sem redirect

## FASE 4 — Build check [Completada ✅]

- [ ] `pnpm --filter @zk/admin build` (ou equivalente) sem erros TypeScript
- [ ] `pnpm --filter @zk/api build` sem erros TypeScript
