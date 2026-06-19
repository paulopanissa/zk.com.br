# Pre-PR Review — feat-107-clientes-api-integration

**Status: YELLOW (aviso)**

---

## Crítico

Nenhum item crítico identificado.

---

## Avisos

### 1. CPF/CNPJ exibido como "Protegido (LGPD)" — comportamento está correto, mas por razão errada

**Arquivo:** `apps/admin/src/pages/clientes/ClienteDetalhe.tsx`, linhas ~197–203

O frontend exibe o ícone de cadeado + texto "Protegido (LGPD)" em vez de qualquer valor. Isso está correto na prática, porque o backend (`toResponse()`) jamais retorna `cpf_cnpj` na rota `GET /customers/:id` (apenas na rota `/export`). Porém o `Cliente` em `types.ts` não possui nenhum campo `cpf_cnpj` — o componente simplesmente não receberia o valor mesmo que quisesse.

Risco real: se amanhã o backend passar a retornar um campo `cpf_cnpj_display` mascarado (ex: `***.456.789-**`), o frontend continuaria exibindo "Protegido (LGPD)" sem consumir o dado — o comportamento seria incorreto sem nenhum erro de compilação. Recomenda-se comentar explicitamente no código que o CPF/CNPJ é omitido intencionalmente pelo backend e só está disponível via `/export`.

### 2. Vendas buscadas por `cliente_id` sem scope de unidade explícito no frontend

**Arquivo:** `apps/admin/src/pages/clientes/ClienteDetalhe.tsx`, linha ~80

```
api.get<VendaResumoResponse>('/vendas', { params: { cliente_id: id, limit: 20, page: 1 } })
```

O `id` aqui é o UUID do cliente vindo da URL (`useParams`). O backend valida que `cliente_id` pertence à unidade do usuário autenticado (linha 29 do `vendas.repository.ts`: `where: { unidade_id: unitId }` + linha 33: `if (filters.cliente_id) where.cliente_id = ...`), então tenancy está protegida no backend. Não há vazamento de dados entre unidades.

Contudo, um atacante autenticado em outra unidade poderia chamar `GET /vendas?cliente_id=<uuid_de_outra_unidade>` e receber lista vazia sem erro — o que não é um vazamento, mas é um comportamento silencioso que pode dificultar debug. Nenhuma ação necessária no frontend; apenas documentar que a filtragem dupla (unidade + cliente) está no backend.

### 3. `busca` enviada sem debounce — potencial de flood

**Arquivo:** `apps/admin/src/pages/clientes/ClientesPage.tsx`, linhas ~336–357

`loadClientes` é disparada via `useCallback` + `useEffect` toda vez que `filtros` muda, e `filtros.busca` atualiza a cada tecla digitada (sem debounce). Cada keystroke dispara um `GET /customers?q=...`. Em produção, isso gera requisições redundantes e impacto no backend. Adicionar debounce de ~300ms no campo de busca antes de propagar para `filtros`.

---

## Sugestões

- `VendaResumo.numero` está tipado como `number` no `types.ts` mas o mock antigo usava `string`. Confirmar com a API que `numero` é sempre `number` (inteiro sequencial) para não quebrar `#{v.numero}` na tabela.
- A seção "Dados de contato" removeu endereços (logradouro, CEP, cidade/UF) por não existirem no modelo `Customer` diretamente. Se endereços forem adicionados ao backend futuramente, há um TODO implícito sem rastreabilidade — vale abrir issue ou deixar comentário no código.

---

**Revisor:** revisor-erp (agente)
**Data:** 2026-06-19
