import { useState, useCallback } from 'react'
import { ProdutoGrid } from './components/ProdutoGrid'
import { Carrinho, type CartItem } from './components/Carrinho'
import { PagamentoModal, type MetodoPagamento } from './components/PagamentoModal'
import { type ProdutoPDV } from '@/data/produtos.mock'

export function VendaScreen() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [showPagamento, setShowPagamento] = useState(false)

  const handleAddProduto = useCallback((produto: ProdutoPDV) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === produto.id)
      if (existing) {
        return prev.map((i) =>
          i.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i,
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
        },
      ]
    })
  }, [])

  const handleUpdateQty = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantidade: i.quantidade + delta } : i))
        .filter((i) => i.quantidade > 0),
    )
  }, [])

  const handleRemove = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id))
  }, [])

  function handleFinalizarPagamento(metodo: MetodoPagamento, trocoCentavos: number) {
    console.log('Venda finalizada', { metodo, trocoCentavos, cart })
    setTimeout(() => {
      setCart([])
      setShowPagamento(false)
    }, 1400)
  }

  const totalCentavos = cart.reduce((acc, i) => acc + i.precoCentavos * i.quantidade, 0)

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
        />
      </div>

      {/* Modal de pagamento */}
      {showPagamento && (
        <PagamentoModal
          totalCentavos={totalCentavos}
          onConfirm={handleFinalizarPagamento}
          onClose={() => setShowPagamento(false)}
        />
      )}
    </div>
  )
}
