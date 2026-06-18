import { Printer, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBRL } from '@/lib/utils'
import type { CartItem } from './Carrinho'
import type { MetodoPagamento } from './PagamentoModal'

const METODO_LABEL: Record<MetodoPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  CARTAO_DEBITO: 'Débito',
  CARTAO_CREDITO: 'Crédito',
  MAQUININHA_POINT: 'Maquininha',
}

export interface VendaFinalizada {
  items: CartItem[]
  subtotalCentavos: number
  descontoCentavos: number
  totalCentavos: number
  metodo: MetodoPagamento
  trocoCentavos: number
  dataHora: Date
}

interface ReciboModalProps {
  venda: VendaFinalizada
  storeName: string
  operatorName: string
  onNovaVenda: () => void
}

function fmt(date: Date) {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ReciboModal({ venda, storeName, operatorName, onNovaVenda }: ReciboModalProps) {
  return (
    <>
      {/* Print styles — only the recibo content is visible when printing */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #recibo-print-area { display: block !important; position: static !important; }
          #recibo-print-area * { color: #000 !important; background: #fff !important; border-color: #ccc !important; box-shadow: none !important; }
          .recibo-no-print { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div
          id="recibo-print-area"
          className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-primary px-5 py-4 text-center text-primary-foreground">
            <p className="font-display text-lg font-bold">{storeName}</p>
            <p className="text-xs opacity-80">{operatorName} · {fmt(venda.dataHora)}</p>
          </div>

          {/* Items */}
          <div className="px-5 py-4 space-y-1 max-h-56 overflow-y-auto">
            {venda.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm gap-2">
                <div className="flex-1 min-w-0">
                  <span className="truncate text-foreground block">{item.nome}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.quantidade}× {formatBRL(item.precoCentavos)}
                  </span>
                </div>
                <span className="tabular-nums font-medium text-foreground shrink-0">
                  {formatBRL(item.precoCentavos * item.quantidade)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-border mx-5" />
          <div className="px-5 py-3 space-y-1.5">
            {venda.descontoCentavos > 0 && (
              <>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatBRL(venda.subtotalCentavos)}</span>
                </div>
                <div className="flex justify-between text-sm text-destructive font-medium">
                  <span>Desconto</span>
                  <span className="tabular-nums">−{formatBRL(venda.descontoCentavos)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums text-primary">{formatBRL(venda.totalCentavos)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Pagamento</span>
              <span>{METODO_LABEL[venda.metodo]}</span>
            </div>
            {venda.trocoCentavos > 0 && (
              <div className="flex justify-between text-sm font-semibold text-success">
                <span>Troco</span>
                <span className="tabular-nums">{formatBRL(venda.trocoCentavos)}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-5 py-3 text-center">
            <p className="text-[10px] text-muted-foreground">Obrigado pela preferência!</p>
          </div>

          {/* Actions — hidden when printing */}
          <div className="recibo-no-print flex gap-3 px-5 pb-4">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={onNovaVenda}
            >
              <ShoppingBag className="h-4 w-4" />
              Nova Venda
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
