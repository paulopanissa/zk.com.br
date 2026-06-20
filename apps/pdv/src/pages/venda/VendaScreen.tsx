import { useState, useCallback } from 'react'
import { ShoppingCart } from 'lucide-react'
import { ProdutoGrid } from './components/ProdutoGrid'
import { Carrinho, type CartItem } from './components/Carrinho'
import { VideoModal } from './components/VideoModal'
import { PagamentoModal, type MetodoPagamento } from './components/PagamentoModal'
import { ReciboModal, type VendaFinalizada } from './components/ReciboModal'
import { type ProdutoPDV } from '@/data/produtos.mock'
import { cn, parseBRLInput, formatBRL } from '@/lib/utils'

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
  const [cartOpen, setCartOpen] = useState(false)
  const [showPagamento, setShowPagamento] = useState(false)
  const [vendaFinalizada, setVendaFinalizada] = useState<VendaFinalizada | null>(null)
  const [descontoTipo, setDescontoTipo] = useState<DescontoTipo>('percent')
  const [descontoInput, setDescontoInput] = useState('')
  const [videoProduto, setVideoProduto] = useState<ProdutoPDV | null>(null)

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
  const totalItens = cart.reduce((acc, i) => acc + i.quantidade, 0)

  const descontoCentavos =
    cart.length === 0
      ? 0
      : descontoTipo === 'percent'
        ? Math.round(
            subtotalCentavos *
              Math.min(
                Math.max(0, parseFloat(descontoInput.replace(',', '.') || '0')),
                100,
              ) /
              100,
          )
        : Math.min(Math.max(0, parseBRLInput(descontoInput)), subtotalCentavos)

  const totalCentavos = subtotalCentavos - descontoCentavos

  function handleFinalizarPagamento(metodo: MetodoPagamento, trocoCentavos: number) {
    setVendaFinalizada({
      items: cart.map((i) => ({ ...i })),
      subtotalCentavos,
      descontoCentavos,
      totalCentavos,
      metodo,
      trocoCentavos,
      dataHora: new Date(),
    })
    setShowPagamento(false)
    setCartOpen(false)
  }

  function handleNovaVenda() {
    setCart([])
    setDescontoInput('')
    setDescontoTipo('percent')
    setVendaFinalizada(null)
  }

  const carrinhoProps = {
    items: cart,
    subtotalCentavos,
    onUpdateQty: handleUpdateQty,
    onRemove: handleRemove,
    onFinalizar: () => setShowPagamento(true),
    descontoTipo,
    descontoInput,
    descontoCentavos,
    onDescontoTipoChange: setDescontoTipo,
    onDescontoInputChange: setDescontoInput,
  }

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Painel esquerdo — catálogo (sempre visível) */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <ProdutoGrid
          onAddProduto={handleAddProduto}
          onShowVideo={(p) => setVideoProduto(p)}
        />
      </div>

      {/* Painel direito — carrinho (sidebar em md+) */}
      <div className="hidden md:flex w-80 xl:w-96 shrink-0 flex-col">
        <Carrinho {...carrinhoProps} />
      </div>

      {/* Mobile: backdrop do bottom sheet */}
      {cartOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={() => setCartOpen(false)}
        />
      )}

      {/* Mobile: bottom sheet do carrinho */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho"
        className={cn(
          'md:hidden fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[88vh] rounded-t-3xl bg-card shadow-2xl transition-transform duration-300 ease-out',
          cartOpen ? 'translate-y-0' : 'translate-y-full',
        )}
        aria-hidden={!cartOpen}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        <Carrinho {...carrinhoProps} onClose={() => setCartOpen(false)} />
      </div>

      {/* Mobile FAB — abre carrinho */}
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className={cn(
          'md:hidden fixed bottom-5 right-4 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3.5 text-primary-foreground shadow-lg shadow-primary/30 transition-all active:scale-95',
          cartOpen && 'opacity-0 pointer-events-none',
        )}
        aria-label="Abrir carrinho"
      >
        <ShoppingCart className="h-5 w-5" />
        {totalItens > 0 ? (
          <>
            <span className="text-sm font-bold">
              {totalItens} {totalItens === 1 ? 'item' : 'itens'}
            </span>
            <span className="text-sm font-bold text-primary-foreground/80">
              · {formatBRL(subtotalCentavos)}
            </span>
          </>
        ) : (
          <span className="text-sm font-medium">Carrinho</span>
        )}
      </button>

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

      {/* Modal de vídeo do produto */}
      {videoProduto?.videoUrl && (
        <VideoModal
          videoUrl={videoProduto.videoUrl}
          nome={videoProduto.nome}
          onClose={() => setVideoProduto(null)}
        />
      )}
    </div>
  )
}
