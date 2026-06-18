import { useState, useCallback } from 'react'
import { ProdutoGrid } from './components/ProdutoGrid'
import { Carrinho, type CartItem } from './components/Carrinho'
import { PagamentoModal, type MetodoPagamento } from './components/PagamentoModal'
import { ReciboModal, type VendaFinalizada } from './components/ReciboModal'
import { type ProdutoPDV } from '@/data/produtos.mock'
import { parseBRLInput } from '@/lib/utils'

export type DescontoTipo = 'percent' | 'valor'

interface VendaScreenProps {
  storeName?: string
  operatorName?: string
}

export function VendaScreen({
  storeName = 'Zoro&Kaya',
  operatorName = 'Operador',
}: VendaScreenProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [showPagamento, setShowPagamento] = useState(false)
  const [vendaFinalizada, setVendaFinalizada] = useState<VendaFinalizada | null>(null)
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

  const descontoCentavos = cart.length === 0
    ? 0
    : descontoTipo === 'percent'
      ? Math.round(
          subtotalCentavos *
            Math.min(Math.max(0, parseFloat(descontoInput.replace(',', '.') || '0')), 100) /
            100,
        )
      : Math.min(Math.max(0, parseBRLInput(descontoInput)), subtotalCentavos)

  const totalCentavos = subtotalCentavos - descontoCentavos

  function handleFinalizarPagamento(metodo: MetodoPagamento, trocoCentavos: number) {
    setVendaFinalizada({
      items: [...cart],
      subtotalCentavos,
      descontoCentavos,
      totalCentavos,
      metodo,
      trocoCentavos,
      dataHora: new Date(),
    })
    setShowPagamento(false)
  }

  function handleNovaVenda() {
    setCart([])
    setDescontoInput('')
    setDescontoTipo('percent')
    setVendaFinalizada(null)
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
          subtotalCentavos={subtotalCentavos}
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

      {/* Recibo — exibido após pagamento confirmado */}
      {vendaFinalizada && (
        <ReciboModal
          venda={vendaFinalizada}
          storeName={storeName}
          operatorName={operatorName}
          onNovaVenda={handleNovaVenda}
        />
      )}
    </div>
  )
}
