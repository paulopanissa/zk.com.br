import { useState, useCallback } from 'react'
import { ProdutoGrid } from './components/ProdutoGrid'
import { Carrinho, type CartItem } from './components/Carrinho'
import { PagamentoModal, type MetodoPagamento } from './components/PagamentoModal'
import { type ProdutoPDV } from '@/data/produtos.mock'

export type DescontoTipo = 'percent' | 'valor'

export function VendaScreen() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [showPagamento, setShowPagamento] = useState(false)
  const [descontoTipo, setDescontoTipo] = useState<DescontoTipo>('percent')
  const [descontoInput, setDescontoInput] = useState('')

  const handleAddProduto = useCallback((produto: ProdutoPDV) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === produto.id)
      if (existing) {
        const next = existing.quantidade + 1
        if (next > existing.maxQuantidade) return prev
        return prev.map((i) =>
          i.id === produto.id ? { ...i, quantidade: next } : i,
        )
      }
      return [
        ...prev,
        {
          id: produto.id,
          nome: produto.nome,
          sku: produto.sku,
          precoCentavos: produto.precoCentavos,
          quantidade: 1,
          maxQuantidade: produto.estoqueDisponivel,
        },
      ]
    })
  }, [])

  const handleUpdateQty = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === id
            ? { ...i, quantidade: Math.min(Math.max(0, i.quantidade + delta), i.maxQuantidade) }
            : i,
        )
        .filter((i) => i.quantidade > 0),
    )
  }, [])

  const handleRemove = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const subtotalCentavos = cart.reduce((acc, i) => acc + i.precoCentavos * i.quantidade, 0)

  const descontoValorRaw = parseFloat(descontoInput || '0')
  const descontoCentavos = cart.length === 0
    ? 0
    : descontoTipo === 'percent'
      ? Math.round(subtotalCentavos * Math.min(Math.max(0, descontoValorRaw), 100) / 100)
      : Math.min(Math.max(0, Math.round(descontoValorRaw * 100)), subtotalCentavos)

  const totalCentavos = subtotalCentavos - descontoCentavos

  function handleFinalizarPagamento(metodo: MetodoPagamento, trocoCentavos: number) {
    console.log('Venda finalizada', { metodo, trocoCentavos, cart, descontoCentavos })
    setTimeout(() => {
      setCart([])
      setDescontoInput('')
      setShowPagamento(false)
    }, 1400)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Painel esquerdo — catálogo */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <ProdutoGrid onAddProduto={handleAddProduto} />
      </div>

      {/* Painel direito — carrinho (largura fixa) */}
      <div className="w-80 shrink-0 xl:w-96">
        <Carrinho
          items={cart}
          onUpdateQty={handleUpdateQty}
          onRemove={handleRemove}
          onFinalizar={() => setShowPagamento(true)}
          descontoTipo={descontoTipo}
          descontoInput={descontoInput}
          descontoCentavos={descontoCentavos}
          onDescontoTipoChange={setDescontoTipo}
          onDescontoInputChange={setDescontoInput}
        />
      </div>

      {/* Modal de pagamento */}
      {showPagamento && (
        <PagamentoModal
          subtotalCentavos={subtotalCentavos}
          descontoCentavos={descontoCentavos}
          totalCentavos={totalCentavos}
          onConfirm={handleFinalizarPagamento}
          onClose={() => setShowPagamento(false)}
        />
      )}
    </div>
  )
}
