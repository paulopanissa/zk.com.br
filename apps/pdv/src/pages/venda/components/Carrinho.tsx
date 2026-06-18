import { Trash2, Minus, Plus, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatBRL } from '@/data/produtos.mock'

export interface CartItem {
  id: string
  nome: string
  sku: string
  precoCentavos: number
  quantidade: number
}

interface CarrinhoProps {
  items: CartItem[]
  onUpdateQty: (id: string, delta: number) => void
  onRemove: (id: string) => void
  onFinalizar: () => void
}

export function Carrinho({ items, onUpdateQty, onRemove, onFinalizar }: CarrinhoProps) {
  const subtotalCentavos = items.reduce((acc, i) => acc + i.precoCentavos * i.quantidade, 0)
  const totalItens = items.reduce((acc, i) => acc + i.quantidade, 0)

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <span className="font-display font-bold text-foreground">Carrinho</span>
        </div>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {totalItens} item{totalItens !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Lista de itens */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 opacity-20" />
            <p className="text-sm">Adicione produtos ao carrinho</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[10px] text-muted-foreground">{item.sku}</span>
                    <span className="text-xs text-muted-foreground">
                      × {formatBRL(item.precoCentavos)}
                    </span>
                  </div>
                </div>

                {/* Controles de quantidade */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.id, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums text-foreground">
                    {item.quantidade}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.id, +1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Subtotal + remover */}
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {formatBRL(item.precoCentavos * item.quantidade)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer com totais + botão */}
      <div className="shrink-0 border-t border-border bg-muted/5 px-4 pt-3 pb-4 space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatBRL(subtotalCentavos)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-foreground">
            <span>Total</span>
            <span className="tabular-nums text-primary">{formatBRL(subtotalCentavos)}</span>
          </div>
        </div>

        <Button
          className={cn(
            'w-full h-12 text-base font-bold',
            items.length === 0 && 'opacity-50 cursor-not-allowed',
          )}
          disabled={items.length === 0}
          onClick={onFinalizar}
        >
          Finalizar venda
        </Button>
      </div>
    </div>
  )
}
