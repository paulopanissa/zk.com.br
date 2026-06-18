# PDV — Recibo de Venda

## FASE 1 — Recibo modal após pagamento confirmado [Em Progresso ⏰]

### Tarefa A — VendaFinalizada type + VendaScreen state [Não Iniciada ⏳]
Adicionar interface VendaFinalizada (items, totais, metodo, troco, dataHora).
Ao handleFinalizarPagamento: salvar dados da venda em estado, não limpar carrinho ainda.
Mostrar ReciboModal. "Nova Venda" button limpa tudo.
Pass storeName + operatorName down from App.tsx → VendaScreen.

### Tarefa B — ReciboModal.tsx [Não Iniciada ⏳]
Modal com: cabeçalho loja/data, tabela de itens, subtotal/desconto/total,
forma de pagamento, troco. Botões: Imprimir + Nova Venda.
CSS @media print: fundo branco, sem bordas coloridas, ocultar botões.

### Tarefa C — App.tsx: pass storeName/operatorName to VendaScreen [Não Iniciada ⏳]
App.tsx atualizado para passar props ao VendaScreen dentro do PDVShell.

### Testes desta fase
- [ ] Recibo aparece após confirmar pagamento
- [ ] Itens, totais, método e troco exibidos corretamente
- [ ] Desconto não aparece quando = 0
- [ ] "Nova Venda" limpa carrinho e fecha recibo
- [ ] Botão Imprimir chama window.print()
