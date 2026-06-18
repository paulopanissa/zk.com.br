import { useState } from 'react'
import { DollarSign, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface AberturaCaixaScreenProps {
  storeName?: string
  operatorName?: string
  onAbrir: (fundoCentavos: number) => void
}

export function AberturaCaixaScreen({
  storeName = 'Zoro&Kaya',
  operatorName = 'Operador',
  onAbrir,
}: AberturaCaixaScreenProps) {
  const [valorStr, setValorStr] = useState('')

  const valorCentavos = Math.round(
    parseFloat(valorStr.replace(/\./g, '').replace(',', '.') || '0') * 100,
  )
  const valido = valorCentavos > 0

  function handleAbrir() {
    if (!valido) return
    onAbrir(valorCentavos)
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-orange text-brand-cream font-display font-bold text-xl">
            Z&amp;K
          </div>
          <div className="text-center">
            <h1 className="font-display text-xl font-bold text-brand-brown">{storeName}</h1>
            <p className="text-sm text-muted-foreground">{operatorName}</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Store className="h-4 w-4 text-primary" />
            </div>
            <h2 className="font-display text-lg font-bold text-foreground">Abertura de Caixa</h2>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fundo de caixa (R$)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0,00"
                value={valorStr}
                onChange={(e) => setValorStr(e.target.value)}
                className={cn(
                  'pl-9 text-lg font-bold tabular-nums',
                  valorStr !== '' && !valido && 'border-destructive',
                )}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAbrir()}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Valor em dinheiro presente no caixa antes das vendas.
            </p>
          </div>

          <Button
            className="w-full h-12 text-base font-bold"
            disabled={!valido}
            onClick={handleAbrir}
          >
            Abrir Caixa
          </Button>
        </div>
      </div>
    </div>
  )
}
