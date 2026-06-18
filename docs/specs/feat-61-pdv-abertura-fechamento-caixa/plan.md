# PDV — Abertura e Fechamento de Caixa

## FASE 1 — Estado de sessão + telas de caixa [Completada ✅]

Introduzir controle de sessão de caixa no PDV com fluxo:
fechado → abertura → venda → fechamento → fechado.

### Tarefa A — `data/caixa.mock.ts` [Não Iniciada ⏳]
Mock de resumo de vendas do turno (por método de pagamento) e interface CaixaSession.

### Tarefa B — `pages/caixa/AberturaCaixaScreen.tsx` [Não Iniciada ⏳]
Tela fullscreen centralizada: campo fundo de caixa (R$), botão Abrir Caixa.
Validação: valor > 0. Design: brand-forest/cream/orange.

### Tarefa C — `pages/caixa/FechamentoCaixaScreen.tsx` [Não Iniciada ⏳]
Tela de fechamento: totais por método de pagamento, saldo esperado em dinheiro
(fundo + vendas dinheiro), campo contagem manual, diferença (sobra/falta),
botão confirmar + botão cancelar (volta ao VendaScreen).

### Tarefa D — Atualizar PDVShell [Não Iniciada ⏳]
Adicionar prop `onFecharCaixa?: () => void`. Quando fornecida, exibir botão
"Fechar Caixa" no header. Manter layout existente.

### Tarefa E — Atualizar App.tsx [Não Iniciada ⏳]
Estado de sessão: `caixaStatus: 'fechado' | 'aberto' | 'fechando'` + `fundoCentavos`.
Renderização condicional por status.

### Testes desta fase
- [ ] AberturaCaixaScreen: botão desabilitado com valor = 0
- [ ] AberturaCaixaScreen: botão habilitado com valor > 0
- [ ] FechamentoCaixaScreen: diferença = 0 quando contagem = esperado
- [ ] FechamentoCaixaScreen: diferença negativa mostra "falta"
- [ ] Fluxo completo: fechado → aberto → fechando → fechado
