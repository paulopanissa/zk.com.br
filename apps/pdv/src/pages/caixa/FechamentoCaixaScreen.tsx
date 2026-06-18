import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, DollarSign, TrendingUp, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatBRL, parseBRLInput } from '@/lib/utils'
import { RESUMO_TURNO_MOCK, METODO_LABEL, type MetodoPagamento } from '@/data/caixa.mock'

const METODOS_ORDER: MetodoPagamento[] = [
  'DINHEIRO',
  'PIX',
  'CARTAO_DEBITO',
  'CARTAO_CREDITO',
  'MAQUININHA_POINT',
]

interface FechamentoCaixaScreenProps {
  fundoCentavos: number
  onFechar: () => void
  onCancelar: () => void
}

export function FechamentoCaixaScreen({
  fundoCentavos,
  onFechar,
  onCancelar,
}: FechamentoCaixaScreenProps) {
  const [contagemStr, setContagemStr] = useState('')
  const [confirmado, setConfirmado] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const resumo = RESUMO_TURNO_MOCK
  const dinheiroVendasCentavos = resumo.porMetodo.DINHEIRO
  const dinheiroEsperadoCentavos = fundoCentavos + dinheiroVendasCentavos

  const contagemCentavos = parseBRLInput(contagemStr)
  const diferencaCentavos = contagemStr !== '' ? contagemCentavos - dinheiroEsperadoCentavos : null

  function handleConfirmar() {
    setConfirmado(true)
    timerRef.current = setTimeout(() => onFechar(), 1500)
  }

  if (confirmado) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <CheckCircle2 className="h-16 w-16 text-success" />
          <p className="font-display text-2xl font-bold text-success">Caixa fechado!</p>
          <p className="text-sm text-muted-foreground">Bom descanso!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={onCancelar}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Voltar para venda"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">Fechamento de Caixa</h1>
      </div>

      <div className="flex-1 px-4 py-5 space-y-5 max-w-md mx-auto w-full">
        {/* Resumo de vendas */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Vendas do turno — {resumo.totalTransacoes} transações
            </span>
          </div>

          <div className="space-y-1.5">
            {METODOS_ORDER.map((metodo) => {
              const valor = resumo.porMetodo[metodo]
              if (valor === 0) return null
              return (
                <div key={metodo} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{METODO_LABEL[metodo]}</span>
                  <span className="tabular-nums font-medium text-foreground">
                    {formatBRL(valor)}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
            <span>Total vendas</span>
            <span className="tabular-nums text-primary">{formatBRL(resumo.totalCentavos)}</span>
          </div>
        </div>

        {/* Saldo de caixa (dinheiro) */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-success" />
            <span className="text-sm font-semibold text-foreground">Saldo em dinheiro</span>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fundo de caixa</span>
              <span className="tabular-nums">{formatBRL(fundoCentavos)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendas em dinheiro</span>
              <span className="tabular-nums">{formatBRL(dinheiroVendasCentavos)}</span>
            </div>
            <div className="border-t border-border pt-1.5 flex justify-between font-semibold">
              <span>Esperado em caixa</span>
              <span className="tabular-nums text-foreground">{formatBRL(dinheiroEsperadoCentavos)}</span>
            </div>
          </div>

          {/* Contagem */}
          <div className="space-y-1.5 pt-1">
            <label
              htmlFor="contagem-dinheiro"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Dinheiro contado (R$)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="contagem-dinheiro"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={contagemStr}
                onChange={(e) => setContagemStr(e.target.value)}
                className="pl-9 text-base font-bold tabular-nums"
              />
            </div>
          </div>

          {/* Diferença */}
          {diferencaCentavos !== null && (
            <div
              className={cn(
                'rounded-lg px-3 py-2 flex justify-between text-sm font-bold',
                diferencaCentavos === 0
                  ? 'bg-success/10 text-success'
                  : diferencaCentavos > 0
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-destructive/10 text-destructive',
              )}
            >
              <span>
                {diferencaCentavos === 0
                  ? 'Conferido ✓'
                  : diferencaCentavos > 0
                    ? 'Sobra'
                    : 'Falta'}
              </span>
              {diferencaCentavos !== 0 && (
                <span className="tabular-nums">{formatBRL(Math.abs(diferencaCentavos))}</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <Button variant="outline" className="flex-1 h-11" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button
            className="flex-1 h-11 font-bold"
            disabled={contagemStr === ''}
            onClick={handleConfirmar}
          >
            Fechar Caixa
          </Button>
        </div>
      </div>
    </div>
  )
}
