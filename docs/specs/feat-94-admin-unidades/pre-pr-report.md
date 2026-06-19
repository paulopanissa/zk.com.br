# Pre-PR Report — feat-94-admin-unidades

## Code Review

Status: 🟡

---

### CRÍTICO

**1. Erro 409 MATRIZ: detecção frágil por string matching**
- `text.toUpperCase().includes('MATRIZ')` (linha 191 de `UnidadesPage.tsx`) é frágil. A API retorna 409 Conflict em três situações distintas (segunda MATRIZ, slug duplicado, tentativa de desativar MATRIZ via deactivate endpoint). O código atual não diferencia os casos e pode exibir a mensagem de "MATRIZ duplicada" para 409 de slug duplicado.
- **Fix**: verificar o `status` HTTP (`e.response?.status === 409`) separadamente do conteúdo da mensagem, ou checar um campo de código de erro estruturado do backend.

**2. `hasAddress` sem validação de campos obrigatórios do endereço**
- (linha 173) A condição `hasAddress` só checa `logradouro` ou `municipio`. Se o usuário preencher apenas um dos dois, a chamada `PUT /units/:id/address` vai falhar no backend (todos os campos marcados como `Sim` no DTO: `logradouro`, `numero`, `bairro`, `municipio`, `uf`, `cep`). O frontend não avisa o usuário antes de tentar — ele só verá o erro genérico no `catch`.
- **Fix**: ou exigir todos os campos do endereço quando qualquer um for preenchido (validação frontend), ou deixar explícito que endereço é tudo-ou-nada com um aviso no form.

**3. CEP e UF não validados antes do envio**
- O invariante do projeto: CEP = 8 dígitos, UF = 2 chars uppercase. O input do CEP faz strip+slice (correto), mas não valida se chegou a 8 dígitos antes de enviar. UF não valida se são letras válidas de estado. Se o usuário digitar 3 dígitos de CEP e salvar, o backend retorna 422 mas o frontend mostra apenas erro genérico.
- **Fix**: antes de chamar `PUT /units/:id/address`, verificar `cep.length === 8` e `uf.length === 2`, exibindo `formError` descritivo.

---

### IMPORTANTE

**4. CNPJ sem validação de dígito verificador no frontend**
- O contrato da API aceita CNPJ de 14 dígitos e valida o dígito verificador (retornando 422). O frontend apenas faz strip de não-dígitos e envia. Uma validação básica do dígito verificador no frontend pouparia o round-trip e daria feedback imediato.
- Severidade: IMPORTANTE (não bloqueia, mas degrada UX e gera round-trip desnecessário).

**5. `handleDeactivate` não trata o 409 de MATRIZ**
- A API retorna `409 Conflict` ao tentar desativar a MATRIZ. O botão de desativar já está oculto para MATRIZ (`unit.tipo !== 'MATRIZ'`), mas o handler usa `alert('Não foi possível desativar. Tente novamente.')` para qualquer erro — se por algum motivo chegar um 409, a mensagem não é informativa. Baixo risco, mas o `catch` deveria checar o status e diferenciar o 409.

**6. `Sidebar.tsx`: ícone duplicado `Building2` para Unidades e Empresa**
- `navItems` tem dois itens com `icon: Building2` (`Unidades` e `Empresa`). Semanticamente correto usar ícones diferentes (ex: `Store` ou `GitBranch` para Unidades). Não é bug funcional, mas gera confusão visual na sidebar.

**7. `load` disparado após `setModal(null)` sem garantia de ordem**
- (linha 186-187) `setModal(null)` e `load()` são chamados sequencialmente. Em React, `setState` é assíncrono e ambos disparam re-renders separados. Não é um bug (o resultado final é correto), mas é o mesmo padrão de MarcasPage — aceitável pelo projeto.

---

### MENOR

**8. `unitToForm` formata CNPJ vindo do backend, mas o backend armazena só dígitos**
- `formatCnpj(unit.cnpj_inscricao)` na edição: correto e intencional. O `stripDigits` antes do envio garante que só dígitos chegam à API. Fluxo está ok.

**9. Contagem de unidades no header usa `units.length` (lista local) em vez de total da API**
- A API não retorna paginação (array completo), então `units.length` é correto. Sem problema.

**10. `tipo` pode ser alterado de FILIAL para MATRIZ via `PUT /units/:id`**
- O form de edição permite mudar o tipo. O backend trata o 409 de MATRIZ duplicada, mas o frontend não avisa proativamente ao usuário que mudar uma FILIAL para MATRIZ desativará a MATRIZ atual (ou falhará). UX mínima aceitável, mas poderia ter um aviso inline.

---

### Conformidade com padrões do projeto

| Padrão | Status |
|--------|--------|
| Sheet para create/edit | ✅ |
| `useCallback` + `useEffect` no load | ✅ |
| `api.get/post/put/patch` | ✅ |
| CNPJ só dígitos no envio | ✅ |
| UF 2 chars uppercase no envio | ✅ |
| CEP 8 dígitos no envio | ⚠️ Não validado antes do envio |
| Erro 409 MATRIZ tratado | ⚠️ Tratado mas por string matching frágil |
| `buildInitialForm` + `unitToForm` helpers | ✅ |
| Rota no `App.tsx` + entrada no `Sidebar.tsx` | ✅ |
