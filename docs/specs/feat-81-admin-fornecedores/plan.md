# Admin — Página de Fornecedores (#81)

## FASE 1 — FornecedoresPage + rota [Em Progresso ⏰]

### Tarefa A — FornecedoresPage.tsx [Não Iniciada ⏳]
Criar `apps/admin/src/pages/fornecedores/FornecedoresPage.tsx`:
- Listagem paginada (LIMIT=20), filtros por razao_social e document
- Modal create/edit: document, razao_social, nome_fantasia, email, phone, website, notes, active (edit only)
- Deactivate com 409 handling
- Padrão idêntico ao MarcasPage

### Tarefa B — Rota em App.tsx [Não Iniciada ⏳]
Adicionar `/fornecedores` em `apps/admin/src/App.tsx`.
Sidebar já tem o link configurado.

### Testes desta fase
- [ ] Página carrega em /fornecedores
- [ ] Listagem exibe fornecedores
- [ ] Filtro por nome funciona
- [ ] Modal cria fornecedor (document + razao_social obrigatórios)
- [ ] Modal edita fornecedor
- [ ] Desativar funciona (soft-delete)
- [ ] Erro 409 exibe mensagem adequada
