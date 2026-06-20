import { Trash2, Minus, Plus, ShoppingCart, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatBRL } from '@/lib/utils'
import type { DescontoTipo } from '../VendaScreen'

export interface CartItem {
  id: string
  nome: string
  sku: string
  precoCentavos: number
  quantidade: number
  maxQuantidade: number
}

interface CarrinhoProps {
  items: CartItem[]
  subtotalCentavos: number
  onUpdateQty: (id: string, delta: number) => void
  onRemove: (id: string) => void
  onFinalizar: () => void
  descontoTipo: DescontoTipo
  descontoInput: string
  descontoCentavos: number
  onDescontoTipoChange: (tipo: DescontoTipo) => void
  onDescontoInputChange: (value: string) => void
  onClose?: () => void
}

export function Carrinho({
  items,
  subtotalCentavos,
  onUpdateQty,
  onRemove,
  onFinalizar,
  descontoTipo,
  descontoInput,
  descontoCentavos,
  onDescontoTipoChange,
  onDescontoInputChange,
  onClose,
}: CarrinhoProps) {
  const totalItens = items.reduce((acc, i) => acc + i.quantidade, 0)
  const totalCentavos = subtotalCentavos - descontoCentavos

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <span className="font-display font-bold text-foreground">Carrinho</span>
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {totalItens} item{totalItens !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {/* Botão fechar — visível apenas no modo mobile (bottom sheet) */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Fechar carrinho"
          >
            <X className="h-4 w-4" />
          </button>
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
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums text-foreground">
                    {item.quantidade}
                  </span>
                  <button
                    type="button"
                    disabled={item.quantidade >= item.maxQuantidade}
                    onClick={() => onUpdateQty(item.id, +1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Aumentar quantidade"
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
                    className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remover item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer com totais + desconto + botão */}
      <div className="shrink-0 border-t border-border bg-muted/5 px-4 pt-3 pb-4 space-y-3">
        <div className="space-y-1.5">
          {/* Subtotal — só mostra quando há desconto */}
          {descontoCentavos > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatBRL(subtotalCentavos)}</span>
            </div>
          )}

          {/* Campo de desconto */}
          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="desconto-input" className="flex items-center gap-1 shrink-0">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Desconto</span>
              </label>
              <div className="flex flex-1 items-center gap-1 min-w-0">
                {/* Toggle % / R$ */}
                <div className="flex rounded-md border border-border overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => onDescontoTipoChange('percent')}
                    className={cn(
                      'px-2 py-0.5 text-xs font-semibold transition-colors',
                      descontoTipo === 'percent'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-accent',
                    )}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => onDescontoTipoChange('valor')}
                    className={cn(
                      'px-2 py-0.5 text-xs font-semibold transition-colors border-l border-border',
                      descontoTipo === 'valor'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-accent',
                    )}
                  >
                    R$
                  </button>
                </div>

                <Input
                  id="desconto-input"
                  type="text"
                  inputMode="decimal"
                  placeholder={descontoTipo === 'percent' ? '0' : '0,00'}
                  value={descontoInput}
                  onChange={(e) => onDescontoInputChange(e.target.value)}
                  className="h-7 text-sm text-right tabular-nums px-2 min-w-0"
                />

                {descontoCentavos > 0 && (
                  <span className="text-sm tabular-nums text-destructive shrink-0 font-medium">
                    −{formatBRL(descontoCentavos)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between text-base font-bold text-foreground">
            <span>Total</span>
            <span className="tabular-nums text-primary">{formatBRL(totalCentavos)}</span>
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
