import { useState } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatBRL, parseBRLInput } from '@/lib/utils'

export type MetodoPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'MAQUININHA_POINT'

const METODOS: { id: MetodoPagamento; label: string; emoji: string }[] = [
  { id: 'DINHEIRO', label: 'Dinheiro', emoji: '💵' },
  { id: 'PIX', label: 'PIX', emoji: '⚡' },
  { id: 'CARTAO_DEBITO', label: 'Débito', emoji: '💳' },
  { id: 'CARTAO_CREDITO', label: 'Crédito', emoji: '💳' },
  { id: 'MAQUININHA_POINT', label: 'Maquininha', emoji: '📟' },
]

interface PagamentoModalProps {
  totalCentavos: number
  subtotalCentavos?: number
  descontoCentavos?: number
  onConfirm: (metodo: MetodoPagamento, trocoCentavos: number) => void
  onClose: () => void
}

export function PagamentoModal({
  totalCentavos,
  subtotalCentavos,
  descontoCentavos = 0,
  onConfirm,
  onClose,
}: PagamentoModalProps) {
  const [metodo, setMetodo] = useState<MetodoPagamento | null>(null)
  const [valorRecebido, setValorRecebido] = useState('')
  const [confirmado, setConfirmado] = useState(false)

  const valorRecebidoCentavos = parseBRLInput(valorRecebido)
  const trocoCentavos = metodo === 'DINHEIRO' ? Math.max(0, valorRecebidoCentavos - totalCentavos) : 0
  const valorInsuficiente = metodo === 'DINHEIRO' && valorRecebido !== '' && valorRecebidoCentavos < totalCentavos
  const canConfirm = metodo !== null && (metodo !== 'DINHEIRO' || valorRecebidoCentavos >= totalCentavos)

  function handleConfirm() {
    if (!metodo || !canConfirm) return
    setConfirmado(true)
    setTimeout(() => onConfirm(metodo, trocoCentavos), 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-xl font-bold text-foreground">Pagamento</h2>
          {!confirmado && (
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {confirmado ? (
          /* Tela de sucesso */
          <div className="flex flex-col items-center gap-4 px-5 py-10">
            <CheckCircle2 className="h-16 w-16 text-success" />
            <p className="font-display text-2xl font-bold text-success">Venda finalizada!</p>
            {trocoCentavos > 0 && (
              <div className="rounded-xl bg-success/10 px-4 py-2 text-center">
                <p className="text-sm text-muted-foreground">Troco</p>
                <p className="text-2xl font-bold tabular-nums text-success">{formatBRL(trocoCentavos)}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-5 space-y-5">
            {/* Total */}
            <div className="rounded-xl bg-primary/10 px-4 py-3">
              {descontoCentavos > 0 && subtotalCentavos !== undefined && (
                <div className="mb-2 space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatBRL(subtotalCentavos)}</span>
                  </div>
                  <div className="flex justify-between text-destructive font-medium">
                    <span>Desconto</span>
                    <span className="tabular-nums">−{formatBRL(descontoCentavos)}</span>
                  </div>
                  <div className="border-t border-primary/20 pt-1" />
                </div>
              )}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total a pagar</p>
                <p className="text-3xl font-bold tabular-nums text-primary">{formatBRL(totalCentavos)}</p>
              </div>
            </div>

            {/* Método */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Forma de pagamento</p>
              <div className="grid grid-cols-5 gap-2">
                {METODOS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetodo(m.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl border py-2.5 px-1 text-center transition-all',
                      metodo === m.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50',
                    )}
                  >
                    <span className="text-lg">{m.emoji}</span>
                    <span className="text-[10px] font-medium leading-tight">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Valor recebido (apenas dinheiro) */}
            {metodo === 'DINHEIRO' && (
              <div className="space-y-1.5">
                <label
                  htmlFor="valor-recebido"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Valor recebido (R$)
                </label>
                <Input
                  id="valor-recebido"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(e.target.value)}
                  className={cn('text-lg font-bold tabular-nums', valorInsuficiente && 'border-destructive')}
                  autoFocus
                />
                {valorInsuficiente && (
                  <p className="text-xs text-destructive">
                    Valor insuficiente. Falta {formatBRL(totalCentavos - valorRecebidoCentavos)}
                  </p>
                )}
                {trocoCentavos > 0 && (
                  <div className="flex justify-between rounded-lg bg-success/10 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Troco</span>
                    <span className="font-bold tabular-nums text-success">{formatBRL(trocoCentavos)}</span>
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full h-12 text-base font-bold"
              disabled={!canConfirm}
              onClick={handleConfirm}
            >
              Confirmar pagamento
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
