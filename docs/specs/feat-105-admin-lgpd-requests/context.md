# Contexto — Admin LGPD (feat/105-admin-lgpd-requests)

## Motivação
O sidebar do admin tem o item LGPD mas sem rota/página. Backend está completo com 4 endpoints.

## Contratos do backend (confirmados via leitura do módulo)

### Enums
- **Status**: `PENDENTE` | `EM_PROCESSAMENTO` | `CONCLUIDA` | `REJEITADA`
- **Tipo**: `EXPORTACAO` | `EXCLUSAO` | `RETIFICACAO` | `REVOGACAO_CONSENTIMENTO`

### POST /lgpd/requests
- `customer_id` (UUID, obrigatório)
- `tipo` (enum, obrigatório)
- `descricao` (string, opcional, max 1000)

### PATCH /lgpd/requests/:id/process
- `status` (só aceita `CONCLUIDA` ou `REJEITADA`)
- `justificativa` (obrigatório se REJEITADA, max 2000)

### GET /lgpd/requests (listagem paginada)
- Query: `status`, `tipo`, `customer_id`, `page`, `limit`
- Resposta: `{ data, total, page, limit }` — items sem `dados_exportados`
- Computed: `prazo_vencido: boolean` em cada item

### GET /lgpd/requests/:id (detalhe)
- Igual ao item de lista + `dados_exportados` (JSON, apenas para EXPORTACAO+CONCLUIDA)

## Campos Prisma relevantes
id, unidade_id, customer_id, tipo, status, descricao, solicitado_em, prazo_legal, processado_em, processado_por, justificativa, dados_exportados, prazo_vencido (computed), created_at, updated_at

## Decisões de UX
- Detail sheet separada para ver detalhes e processar (muito conteúdo para inline)
- NovaLgpdModal (Sheet) para criar solicitação
- Prazo visual: verde > 7d, warning ≤ 7d, destrutivo = vencido
- dados_exportados: exibido como JSON formatado com aviso de dado sensível
- Tabela sem customer_name (backend não retorna); mostrar customer_id truncado (8 chars)
