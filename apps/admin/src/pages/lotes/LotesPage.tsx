import { useCallback, useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
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

/** Map UI status filter to API query params */
function statusToApiParams(
  status: StatusFiltro,
): { active?: boolean; expires_before?: string; expires_after?: string } {
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

type StatusFiltro = 'all' | 'valido' | 'vencendo' | 'vencido'

const STATUS_CHIPS: { value: StatusFiltro; label: string }[] = [
  { value: 'valido', label: 'Com validade futura' },
  { value: 'vencendo', label: 'Vencendo em 30d' },
  { value: 'vencido', label: 'Vencidos' },
]

function ToggleChip({
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
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'border-border text-muted-foreground hover:border-primary hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

const LIMIT = 20

export function LotesPage() {
  const [lots, setLots] = useState<LotItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('all')

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

  function handlePageChange(p: number) {
    setPage(p)
  }

  const temFiltro = busca !== '' || statusFiltro !== 'all'

  // Summary counts (derived from current page — informational only)
  const vencidosCount = lots.filter((l) => getLotStatus(l) === 'vencido').length
  const vencendoCount = lots.filter((l) => getLotStatus(l) === 'vencendo').length

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Lotes</h1>
        <div className="flex items-center gap-4 mt-1">
          <p className="text-sm text-muted-foreground">
            {loading ? 'Carregando…' : `${total} ${total === 1 ? 'lote' : 'lotes'} encontrados`}
          </p>
          {vencendoCount > 0 && (
            <span className="text-xs font-medium text-warning">
              {vencendoCount} vencendo em breve
            </span>
          )}
          {vencidosCount > 0 && (
            <span className="text-xs font-medium text-destructive">
              {vencidosCount} vencido{vencidosCount !== 1 ? 's' : ''} nesta página
            </span>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                onClick={() => handleStatusToggle(chip.value)}
              />
            ))}
          </div>

          {temFiltro && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-muted-foreground"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="rounded-lg border border-border bg-card py-16 text-center text-sm text-muted-foreground shadow-sm">
          Carregando lotes…
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <LotesTable
          lots={lots}
          page={page}
          limit={LIMIT}
          total={total}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  )
}
