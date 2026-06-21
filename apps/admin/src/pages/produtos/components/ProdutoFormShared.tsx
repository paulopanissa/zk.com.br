import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Calculator, ChevronDown, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

interface CostCenter {
  id: string
  nome: string
  ativo: boolean
}

interface MethodMapping {
  id: string
  canal: string
  metodo: string
  ativo: boolean
  taxa_percentual: number
  taxa_fixa_centavos: number
}

interface CostCenterWithItems {
  id: string
  items: Array<{
    tipo: 'FIXO' | 'VARIAVEL'
    ativo: boolean
    valor_centavos: number | null
    percentual_bps: number | null
  }>
}

interface CalcFields {
  quantidade: string
  impostos: string
  taxa_cartao: string
  frete: string
  custo_fixo: string
  custo_variavel: string
  comissao: string
  margem: string
}

interface CalcBreakdown {
  custo_base_centavos: number
  custo_impostos_centavos: number
  custo_operacional_var_centavos: number
  custo_cartao_centavos: number
  custo_comissao_centavos: number
  frete_centavos: number
}

interface CalcResult {
  custo_total_centavos: number
  preco_sugerido_centavos: number
  margem_reais_centavos: number
  margem_percentual_bps: number
  breakdown: CalcBreakdown
}

const METODO_LABEL: Record<string, string> = {
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito',
  MAQUININHA_POINT: 'Maquininha Point',
  BOLETO: 'Boleto',
  DINHEIRO: 'Dinheiro',
}

function CalcRow({
  label,
  unit,
  value,
  onChange,
  hint,
}: {
  label: string
  unit: '%' | 'R$'
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
        {hint && (
          <span className="text-[10px] text-success/80 truncate max-w-[80px]" title={hint}>
            ← {hint}
          </span>
        )}
      </div>
      <div className="relative w-24 shrink-0">
        {unit === 'R$' && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
            R$
          </span>
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
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
            %
          </span>
        )}
      </div>
    </div>
  )
}

function BreakdownRow({
  label,
  cents,
  pv,
  highlight,
}: {
  label: string
  cents: number
  pv: number
  highlight?: boolean
}) {
  const pct = pv > 0 ? ((cents / pv) * 100).toFixed(1) : '0.0'
  return (
    <div
      className={cn(
        'flex items-center justify-between text-xs',
        highlight ? 'font-semibold text-foreground' : 'text-muted-foreground',
      )}
    >
      <span>{label}</span>
      <span>
        R$ {(cents / 100).toFixed(2).replace('.', ',')}
        {!highlight && <span className="ml-1 text-[10px] opacity-60">({pct}%)</span>}
      </span>
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
    quantidade: '1',
    impostos: '',
    taxa_cartao: '',
    frete: '',
    custo_fixo: '',
    custo_variavel: '',
    comissao: '',
    margem: '',
  })
  const [hints, setHints] = useState<{ custo_fixo?: string; custo_variavel?: string; taxa_cartao?: string }>({})
  const [result, setResult] = useState<CalcResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [calcError, setCalcError] = useState('')

  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [selectedCcId, setSelectedCcId] = useState('')
  const [methods, setMethods] = useState<MethodMapping[]>([])
  const [selectedMethod, setSelectedMethod] = useState('')

  const qty = Math.max(1, Math.floor(parseFloat(fields.quantidade) || 1))
  const freteUnit = qty > 1 && parseFloat(fields.frete) > 0
    ? (parseFloat(fields.frete) / qty).toFixed(2)
    : null
  const custoFixoUnit = qty > 1 && parseFloat(fields.custo_fixo) > 0
    ? (parseFloat(fields.custo_fixo) / qty).toFixed(2)
    : null

  useEffect(() => {
    if (!open) return
    api
      .get<{ data: CostCenter[] }>('/cost-centers', { params: { limit: 50 } })
      .then(({ data }) => setCostCenters(data.data.filter((c) => c.ativo)))
      .catch(() => {})
    api
      .get<MethodMapping[]>('/payment-config/methods')
      .then(({ data }) => setMethods(data.filter((m) => m.ativo)))
      .catch(() => {})
  }, [open])

  async function handleCcSelect(id: string) {
    setSelectedCcId(id)
    if (!id) {
      setFields((f) => ({ ...f, custo_fixo: '', custo_variavel: '' }))
      setHints((h) => ({ ...h, custo_fixo: undefined, custo_variavel: undefined }))
      return
    }
    try {
      const { data } = await api.get<CostCenterWithItems>(`/cost-centers/${id}`)
      const items = data.items ?? []
      const fixo = items
        .filter((i) => i.ativo && i.tipo === 'FIXO')
        .reduce((s, i) => s + (i.valor_centavos ?? 0), 0)
      const variavel = items
        .filter((i) => i.ativo && i.tipo === 'VARIAVEL')
        .reduce((s, i) => s + (i.percentual_bps ?? 0), 0)
      setFields((f) => ({
        ...f,
        custo_fixo: (fixo / 100).toFixed(2),
        custo_variavel: (variavel / 100).toFixed(2),
      }))
      setHints((h) => ({ ...h, custo_fixo: 'auto', custo_variavel: 'auto' }))
    } catch {
      setCalcError('Não foi possível carregar o centro de custo selecionado')
      setSelectedCcId('')
    }
    setResult(null)
  }

  function handleMethodSelect(methodId: string) {
    setSelectedMethod(methodId)
    const m = methods.find((x) => x.id === methodId)
    if (m) {
      setFields((f) => ({ ...f, taxa_cartao: (m.taxa_percentual / 100).toFixed(2) }))
      setHints((h) => ({ ...h, taxa_cartao: METODO_LABEL[m.metodo] ?? m.metodo }))
    } else {
      setFields((f) => ({ ...f, taxa_cartao: '' }))
      setHints((h) => ({ ...h, taxa_cartao: undefined }))
    }
    setResult(null)
  }

  function setF<K extends keyof CalcFields>(k: K, v: string) {
    setFields((p) => ({ ...p, [k]: v }))
    setResult(null)
  }

  function bps(pctStr: string) {
    return Math.round((parseFloat(pctStr) || 0) * 100)
  }
  function cents(brlStr: string) {
    return Math.round((parseFloat(brlStr) || 0) * 100)
  }

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
      // frete e custo_fixo são totais da compra — divide pela quantidade para obter o unitário
      const freteUnitCents = Math.round(cents(fields.frete) / qty)
      const custoFixoUnitCents = Math.round(cents(fields.custo_fixo) / qty)
      const { data } = await api.post<CalcResult>('/pricing-engine/calculate', {
        preco_custo_centavos: costCents,
        impostos_bps: bps(fields.impostos),
        frete_centavos: freteUnitCents,
        custo_operacional_centavos: custoFixoUnitCents,
        custo_operacional_variavel_bps: bps(fields.custo_variavel),
        taxa_cartao_bps: bps(fields.taxa_cartao),
        comissao_bps: bps(fields.comissao),
        margem_desejada_bps: bps(fields.margem),
      })
      setResult(data)
    } catch (err) {
      setCalcError(extractApiError(err))
    } finally {
      setCalculating(false)
    }
  }

  return (
    <div className="border-t border-border/60">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          setCalcError('')
        }}
        className="flex w-full items-center justify-between px-5 py-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          <Calculator className="h-3.5 w-3.5" />
          Calculadora de preço
        </span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-4">
          {/* SEBRAE formula note */}
          <div className="flex items-start gap-1.5 rounded-md bg-muted/40 px-3 py-2">
            <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Usa o <strong>mark-up inverso (SEBRAE)</strong>: impostos, cartão, comissão e custos
              variáveis incidem sobre o preço de venda.{' '}
              <span className="font-mono">PV = Custo ÷ (1 − DV% − Margem%)</span>
            </p>
          </div>

          {/* Auto-fill selectors */}
          {(costCenters.length > 0 || methods.length > 0) && (
            <div className="space-y-2">
              {costCenters.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Centro de custo
                  </span>
                  <Select value={selectedCcId} onValueChange={handleCcSelect}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {costCenters.map((cc) => (
                        <SelectItem key={cc.id} value={cc.id}>
                          {cc.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {methods.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Método de pagamento
                  </span>
                  <Select value={selectedMethod} onValueChange={handleMethodSelect}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {methods.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {METODO_LABEL[m.metodo] ?? m.metodo} ({m.canal})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Section: Custos da compra */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Custos da compra
            </p>
            {/* Quantidade */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Qtd. comprada</span>
              <Input
                type="number"
                min="1"
                step="1"
                value={fields.quantidade}
                onChange={(e) => setF('quantidade', e.target.value)}
                className="h-7 text-xs w-24 shrink-0"
              />
            </div>
            {/* Frete */}
            <div className="space-y-0.5">
              <CalcRow
                label="Frete total"
                unit="R$"
                value={fields.frete}
                onChange={(v) => setF('frete', v)}
              />
              {freteUnit && (
                <p className="text-[10px] text-primary/70 text-right pr-1">
                  R$ {freteUnit.replace('.', ',')} / unidade
                </p>
              )}
            </div>
            {/* Custo fixo */}
            <div className="space-y-0.5">
              <CalcRow
                label="Custo fixo total"
                unit="R$"
                value={fields.custo_fixo}
                onChange={(v) => { setF('custo_fixo', v); setSelectedCcId('') }}
                hint={hints.custo_fixo}
              />
              {custoFixoUnit && (
                <p className="text-[10px] text-primary/70 text-right pr-1">
                  R$ {custoFixoUnit.replace('.', ',')} / unidade
                </p>
              )}
            </div>
          </div>

          {/* Section: Despesas variáveis */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Despesas variáveis (% sobre PV)
            </p>
            <CalcRow
              label="Impostos"
              unit="%"
              value={fields.impostos}
              onChange={(v) => setF('impostos', v)}
            />
            <CalcRow
              label="Taxa cartão/gateway"
              unit="%"
              value={fields.taxa_cartao}
              onChange={(v) => { setF('taxa_cartao', v); setSelectedMethod('') }}
              hint={hints.taxa_cartao}
            />
            <CalcRow
              label="Comissão"
              unit="%"
              value={fields.comissao}
              onChange={(v) => setF('comissao', v)}
            />
            <CalcRow
              label="Custo variável"
              unit="%"
              value={fields.custo_variavel}
              onChange={(v) => { setF('custo_variavel', v); setSelectedCcId('') }}
              hint={hints.custo_variavel}
            />
          </div>

          {/* Margem */}
          <CalcRow
            label="Margem desejada"
            unit="%"
            value={fields.margem}
            onChange={(v) => setF('margem', v)}
          />

          {calcError && <p className="text-xs text-destructive">{calcError}</p>}

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
            <div className="rounded-md border border-border bg-muted/20 px-3 py-3 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Resultado por unidade
              </p>
              <BreakdownRow
                label="Custo base (compra + frete + fixo)"
                cents={result.breakdown.custo_base_centavos}
                pv={result.preco_sugerido_centavos}
              />
              {result.breakdown.custo_impostos_centavos > 0 && (
                <BreakdownRow
                  label="Impostos"
                  cents={result.breakdown.custo_impostos_centavos}
                  pv={result.preco_sugerido_centavos}
                />
              )}
              {result.breakdown.custo_cartao_centavos > 0 && (
                <BreakdownRow
                  label="Taxa cartão/gateway"
                  cents={result.breakdown.custo_cartao_centavos}
                  pv={result.preco_sugerido_centavos}
                />
              )}
              {result.breakdown.custo_comissao_centavos > 0 && (
                <BreakdownRow
                  label="Comissão"
                  cents={result.breakdown.custo_comissao_centavos}
                  pv={result.preco_sugerido_centavos}
                />
              )}
              {result.breakdown.custo_operacional_var_centavos > 0 && (
                <BreakdownRow
                  label="Custo variável"
                  cents={result.breakdown.custo_operacional_var_centavos}
                  pv={result.preco_sugerido_centavos}
                />
              )}
              <div className="border-t border-border/60 my-1" />
              <BreakdownRow
                label="Custo total"
                cents={result.custo_total_centavos}
                pv={result.preco_sugerido_centavos}
              />
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-foreground">Preço sugerido</span>
                <span className="text-foreground text-sm">
                  R$ {(result.preco_sugerido_centavos / 100).toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Margem</span>
                <span
                  className={cn(
                    result.margem_percentual_bps >= 0 ? 'text-success' : 'text-destructive',
                  )}
                >
                  R$ {(result.margem_reais_centavos / 100).toFixed(2).replace('.', ',')} (
                  {(result.margem_percentual_bps / 100).toFixed(1)}% do PV)
                </span>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  onUseSuggestedPrice((result.preco_sugerido_centavos / 100).toFixed(2))
                }
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
