# Admin — Notas de Entrada (#83)

## FASE 1 — Listagem e upload XML [Em Progresso ⏰]

### Tarefa A — NotasEntradaPage.tsx
- Listagem paginada com filtros (status, fornecedor, data)
- Upload XML via dropzone → POST /nf-entrada/from-xml → redir detalhe
- Criação manual via Sheet
- Badges de status: RASCUNHO (laranja), CONFIRMADA (verde), CANCELADA (cinza)

### Tarefa B — Rota no App.tsx
- /notas-entrada → NotasEntradaPage
- /notas-entrada/:id → NotaEntradaDetalhe

## FASE 2 — Detalhe da NF [Não Iniciada ⏳]

### Tarefa A — NotaEntradaDetalhe.tsx
- Cabeçalho com dados da NF
- Tabela de itens com vinculação produto/marca
- Bulk brand em todos os itens
- Ações: Confirmar, Cancelar, Anexar PDF
