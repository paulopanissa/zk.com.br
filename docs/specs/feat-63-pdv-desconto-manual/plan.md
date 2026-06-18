# PDV — Desconto Manual no Total da Venda

## FASE 1 — Desconto no carrinho + modal de pagamento [Em Progresso ⏰]

### Tarefa A — VendaScreen: estado de desconto [Não Iniciada ⏳]
Adicionar estado `descontoTipo: 'percent' | 'valor'` e `descontoInput: string`.
Calcular `descontoCentavos` e `totalCentavos`. Resetar desconto ao limpar carrinho.

### Tarefa B — Carrinho: UI de desconto no footer [Não Iniciada ⏳]
Toggle % / R$, input de valor, linha de desconto no resumo financeiro.
Desconto visível apenas quando carrinho tem itens.

### Tarefa C — PagamentoModal: breakdown subtotal/desconto/total [Não Iniciada ⏳]
Adicionar props `subtotalCentavos` e `descontoCentavos`. Exibir linha de desconto
quando > 0. Total a pagar = totalCentavos (já descontado).

### Testes desta fase
- [ ] Desconto % de 10 sobre R$100,00 = R$10,00 de desconto → total R$90,00
- [ ] Desconto R$ não pode exceder subtotal (clamped)
- [ ] Desconto zerado ao finalizar venda
- [ ] Modal exibe linha de desconto quando descontoCentavos > 0
- [ ] Modal não exibe linha de desconto quando = 0
