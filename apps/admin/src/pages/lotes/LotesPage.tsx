import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, FileText, Package, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { getLotStatus, LotesTable, type LotItem } from './components/LotesTable'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LotesPageResponse {
  data: LotItem[]
  total: number
  page: number
  limit: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type StatusFiltro = 'all' | 'valido' | 'vencendo' | 'vencido'

function statusToApiParams(
  status: StatusFiltro,
): { expires_before?: string; expires_after?: string } {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const in30Days = new Date()
  in30Days.setDate(in30Days.getDate() + 30)
  const in30DaysStr = in30Days.toISOString().slice(0, 10)

  switch (status) {
    case 'vencido':
      return { expires_before: todayStr }
    case 'vencendo':
      return { expires_after: todayStr, expires_before: in30DaysStr }
    case 'valido':
      return { expires_after: in30DaysStr }
    default:
      return {}
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const STATUS_CHIPS: { value: StatusFiltro; label: string; urgency?: 'warning' | 'danger' }[] = [
  { value: 'valido', label: 'Com validade futura' },
  { value: 'vencendo', label: 'Vencendo em 30d', urgency: 'warning' },
  { value: 'vencido', label: 'Vencidos', urgency: 'danger' },
]

function ToggleChip({
  label,
  active,
  urgency,
  count,
  onClick,
}: {
  label: string
  active: boolean
  urgency?: 'warning' | 'danger'
  count?: number
  onClick: () => void
}) {
  const baseClass = 'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors'
  const activeClass =
    urgency === 'danger'
      ? 'bg-destructive text-white border-destructive'
      : urgency === 'warning'
      ? 'bg-warning text-white border-warning'
      : 'bg-primary text-primary-foreground border-primary'
  const idleClass =
    urgency === 'danger'
      ? 'border-destructive/40 text-destructive hover:bg-destructive/10'
      : urgency === 'warning'
      ? 'border-warning/40 text-warning hover:bg-warning/10'
      : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'

  return (
    <button type="button" onClick={onClick} className={cn(baseClass, active ? activeClass : idleClass)}>
      {label}
      {count !== undefined && count > 0 && (
        <span className={cn(
          'rounded-full px-1.5 py-0.5 text-xs font-bold leading-none tabular-nums',
          active ? 'bg-white/25' : urgency === 'danger' ? 'bg-destructive/15' : urgency === 'warning' ? 'bg-warning/15' : 'bg-muted',
        )}>
          {count}
        </span>
      )}
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

const LIMIT = 20

export function LotesPage() {
  const navigate = useNavigate()

  const [lots, setLots] = useState<LotItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('all')

  // Global urgency counts (not page-scoped)
  const [vencidosTotal, setVencidosTotal] = useState(0)
  const [vencendoTotal, setVencendoTotal] = useState(0)

  // Fetch urgency counts once on mount
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const in30Days = new Date()
    in30Days.setDate(in30Days.getDate() + 30)
    const in30DaysStr = in30Days.toISOString().slice(0, 10)

    api
      .get<LotesPageResponse>('/lots', { params: { limit: 1, expires_before: today } })
      .then((r) => setVencidosTotal(r.data.total))
      .catch(() => {/* non-critical */})

    api
      .get<LotesPageResponse>('/lots', {
        params: { limit: 1, expires_after: today, expires_before: in30DaysStr },
      })
      .then((r) => setVencendoTotal(r.data.total))
      .catch(() => {/* non-critical */})
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)

    const params: Record<string, unknown> = { page, limit: LIMIT }
    if (busca.trim()) params.code = busca.trim()
    Object.assign(params, statusToApiParams(statusFiltro))

    api
      .get<LotesPageResponse>('/lots', { params })
      .then((r) => {
        setLots(r.data.data)
        setTotal(r.data.total)
      })
      .catch(() => setError('Não foi possível carregar os lotes. Tente novamente.'))
      .finally(() => setLoading(false))
  }, [page, busca, statusFiltro])

  useEffect(() => {
    load()
  }, [load])

  function handleBuscaChange(value: string) {
    setBusca(value)
    setPage(1)
  }

  function handleStatusToggle(s: StatusFiltro) {
    setStatusFiltro((prev) => (prev === s ? 'all' : s))
    setPage(1)
  }

  function handleClear() {
    setBusca('')
    setStatusFiltro('all')
    setPage(1)
  }

  const temFiltro = busca !== '' || statusFiltro !== 'all'
  const hasUrgency = vencidosTotal > 0 || vencendoTotal > 0

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Lotes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Carregando…' : `${total} ${total === 1 ? 'lote' : 'lotes'} encontrados`}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => navigate('/notas-entrada')}
        >
          <FileText className="h-3.5 w-3.5" />
          Notas de Entrada
        </Button>
      </div>

      {/* Urgency banner — only when vencidos/vencendo exist */}
      {hasUrgency && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/8 px-4 py-3 animate-in slide-in-from-top-2 fade-in duration-300">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <p className="text-sm text-foreground flex-1">
            {vencidosTotal > 0 && (
              <span className="font-semibold text-destructive">
                {vencidosTotal} {vencidosTotal === 1 ? 'lote vencido' : 'lotes vencidos'}
              </span>
            )}
            {vencidosTotal > 0 && vencendoTotal > 0 && <span className="text-muted-foreground"> e </span>}
            {vencendoTotal > 0 && (
              <span className="font-semibold text-warning">
                {vencendoTotal} {vencendoTotal === 1 ? 'vencendo em 30 dias' : 'vencendo em 30 dias'}
              </span>
            )}
            <span className="text-muted-foreground"> no estoque — revise e descarte se necessário.</span>
          </p>
          <button
            type="button"
            onClick={() => handleStatusToggle(vencidosTotal > 0 ? 'vencido' : 'vencendo')}
            className="text-xs font-medium text-foreground underline underline-offset-2 shrink-0 hover:text-muted-foreground transition-colors"
          >
            Ver {vencidosTotal > 0 ? 'vencidos' : 'vencendo'}
          </button>
        </div>
      )}

      {/* Info callout — how lots are created */}
      <div className="flex items-start gap-3 rounded-xl border border-brand-sage/30 bg-brand-sage/8 px-4 py-3">
        <Package className="h-4 w-4 text-brand-sage mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground">
          Lotes são criados automaticamente ao{' '}
          <button
            type="button"
            onClick={() => navigate('/notas-entrada')}
            className="font-medium text-foreground underline underline-offset-2 hover:text-brand-orange transition-colors"
          >
            confirmar uma Nota de Entrada
          </button>
          . Cada item com código de lote ou data de validade gera um registro aqui.
        </p>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por código do lote"
              value={busca}
              onChange={(e) => handleBuscaChange(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_CHIPS.map((chip) => (
              <ToggleChip
                key={chip.value}
                label={chip.label}
                active={statusFiltro === chip.value}
                urgency={chip.urgency}
                count={
                  chip.value === 'vencido'
                    ? vencidosTotal
                    : chip.value === 'vencendo'
                    ? vencendoTotal
                    : undefined
                }
                onClick={() => handleStatusToggle(chip.value)}
              />
            ))}
          </div>

          {temFiltro && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground gap-1">
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="h-10 flex-[2] rounded-md bg-muted" />
                <div className="h-10 flex-1 rounded-md bg-muted" />
                <div className="h-10 flex-1 rounded-md bg-muted" />
                <div className="h-10 flex-1 rounded-md bg-muted" />
                <div className="h-10 w-20 rounded-md bg-muted" />
                <div className="h-10 w-16 rounded-md bg-muted" />
                <div className="h-10 w-24 rounded-md bg-muted" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <LotesTable
          lots={lots}
          page={page}
          limit={LIMIT}
          total={total}
          hasFilters={temFiltro}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
