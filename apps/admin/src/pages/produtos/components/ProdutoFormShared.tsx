import { useState } from 'react'
import type { ReactNode } from 'react'
import { Calculator, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

export const ORIGENS = [
  { value: '0', label: '0 – Nacional' },
  { value: '1', label: '1 – Estrangeira — importação direta' },
  { value: '2', label: '2 – Estrangeira — adquirida no mercado interno' },
  { value: '3', label: '3 – Nacional — conteúdo importado > 40%' },
  { value: '4', label: '4 – Nacional — produção conforme processos básicos' },
  { value: '5', label: '5 – Nacional — conteúdo importado ≤ 40%' },
  { value: '6', label: '6 – Estrangeira — importação direta, sem similar nacional' },
  { value: '7', label: '7 – Estrangeira — mercado interno, sem similar nacional' },
  { value: '8', label: '8 – Nacional — conteúdo importado > 70%' },
]

export function extractApiError(err: unknown): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
  return typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erro ao salvar'
}

export function FormCard({
  children,
  error,
  onSave,
  saving,
  saveLabel = 'Salvar alterações',
}: {
  children: ReactNode
  error: string
  onSave: () => void
  saving: boolean
  saveLabel?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="space-y-6 px-6 py-5">
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {children}
      </div>
      <div className="flex justify-end border-t border-border/60 px-6 py-4">
        <Button onClick={onSave} disabled={saving}>
          {saving ? 'Salvando...' : saveLabel}
        </Button>
      </div>
    </div>
  )
}

export function FormSection({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
  trailing,
}: {
  label: string
  hint?: string
  children: ReactNode
  trailing?: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground">{label}</label>
        {trailing}
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function PriceInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
      <Input
        type="number"
        min="0"
        step="0.01"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  )
}

export function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:border-primary hover:text-foreground',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-primary-foreground' : 'bg-muted-foreground',
        )}
      />
      {label}
    </button>
  )
}

export function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length
  const near = len > max * 0.85
  const over = len > max
  return (
    <span
      className={cn(
        'text-xs tabular-nums',
        over
          ? 'font-medium text-destructive'
          : near
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-muted-foreground',
      )}
    >
      {len}/{max}
    </span>
  )
}

// ── Pricing Calculator ─────────────────────────────────────────────────────

interface CalcFields {
  impostos: string
  taxa_cartao: string
  frete: string
  custo_fixo: string
  custo_variavel: string
  margem: string
}

interface CalcResult {
  custo_total_centavos: number
  preco_sugerido_centavos: number
  margem_reais_centavos: number
  margem_percentual_bps: number
}

function CalcRow({
  label,
  unit,
  value,
  onChange,
}: {
  label: string
  unit: '%' | 'R$'
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <div className="relative w-24 shrink-0">
        {unit === 'R$' && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">R$</span>
        )}
        <Input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn('h-7 text-xs', unit === 'R$' ? 'pl-6 pr-2' : 'pl-2 pr-6')}
        />
        {unit === '%' && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">%</span>
        )}
      </div>
    </div>
  )
}

export function PricingCalculator({
  costPriceStr,
  onUseSuggestedPrice,
}: {
  costPriceStr: string
  onUseSuggestedPrice: (price: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [fields, setFields] = useState<CalcFields>({
    impostos: '', taxa_cartao: '', frete: '', custo_fixo: '', custo_variavel: '', margem: '',
  })
  const [result, setResult] = useState<CalcResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [calcError, setCalcError] = useState('')

  function setF<K extends keyof CalcFields>(k: K, v: string) {
    setFields((p) => ({ ...p, [k]: v }))
    setResult(null)
  }

  function bps(pctStr: string) { return Math.round((parseFloat(pctStr) || 0) * 100) }
  function cents(brlStr: string) { return Math.round((parseFloat(brlStr) || 0) * 100) }

  async function calculate() {
    const costCents = Math.round((parseFloat(costPriceStr) || 0) * 100)
    if (!costCents) {
      setCalcError('Informe o custo do produto antes de calcular')
      return
    }
    setCalculating(true)
    setCalcError('')
    setResult(null)
    try {
      const { data } = await api.post<CalcResult>('/pricing-engine/calculate', {
        preco_custo_centavos: costCents,
        impostos_bps: bps(fields.impostos),
        frete_centavos: cents(fields.frete),
        custo_operacional_centavos: cents(fields.custo_fixo),
        custo_operacional_variavel_bps: bps(fields.custo_variavel),
        taxa_cartao_bps: bps(fields.taxa_cartao),
        margem_desejada_bps: bps(fields.margem),
      })
      setResult(data)
    } catch (err) {
      setCalcError(extractApiError(err))
    } finally {
      setCalculating(false)
    }
  }

  function fmt(cents: number) {
    return (cents / 100).toFixed(2).replace('.', ',')
  }

  return (
    <div className="border-t border-border/60">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setCalcError('') }}
        className="flex w-full items-center justify-between px-5 py-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          <Calculator className="h-3.5 w-3.5" />
          Calculadora de preço
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Simule o preço de venda com base em todos os custos do produto.
          </p>

          <div className="space-y-2">
            <CalcRow label="Impostos" unit="%" value={fields.impostos} onChange={(v) => setF('impostos', v)} />
            <CalcRow label="Taxa do cartão" unit="%" value={fields.taxa_cartao} onChange={(v) => setF('taxa_cartao', v)} />
            <CalcRow label="Frete" unit="R$" value={fields.frete} onChange={(v) => setF('frete', v)} />
            <CalcRow label="Custo fixo *" unit="R$" value={fields.custo_fixo} onChange={(v) => setF('custo_fixo', v)} />
            <CalcRow label="Custo variável" unit="%" value={fields.custo_variavel} onChange={(v) => setF('custo_variavel', v)} />
            <CalcRow label="Margem desejada" unit="%" value={fields.margem} onChange={(v) => setF('margem', v)} />
          </div>

          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
            * Custo fixo via Centro de Custo (próximo módulo)
          </p>

          {calcError && (
            <p className="text-xs text-destructive">{calcError}</p>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={calculate}
            disabled={calculating}
            className="w-full h-8 text-xs gap-1.5"
          >
            <Calculator className="h-3 w-3" />
            {calculating ? 'Calculando...' : 'Calcular preço'}
          </Button>

          {result && (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Custo total</span>
                <span>R$ {fmt(result.custo_total_centavos)}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Preço sugerido</span>
                <span className="text-foreground">R$ {fmt(result.preco_sugerido_centavos)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Margem</span>
                <span className={cn(result.margem_percentual_bps >= 0 ? 'text-success' : 'text-destructive')}>
                  R$ {fmt(result.margem_reais_centavos)} ({(result.margem_percentual_bps / 100).toFixed(1)}%)
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => onUseSuggestedPrice((result.preco_sugerido_centavos / 100).toFixed(2))}
                className="w-full h-7 text-xs mt-1"
              >
                Usar este preço
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
