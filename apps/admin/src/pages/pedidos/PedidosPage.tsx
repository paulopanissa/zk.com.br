import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { PedidosTable } from './components/PedidosTable'
import {
  type VendaListItem,
  type VendaPageResponse,
  type VendaStatus,
  type VendaOrigem,
} from './types'

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFiltro = 'all' | VendaStatus
type OrigemFiltro = 'all' | VendaOrigem

// ─── Sub-components ───────────────────────────────────────────────────────────

const STATUS_CHIPS: { value: VendaStatus; label: string }[] = [
  { value: 'ABERTA', label: 'Aberta' },
  { value: 'FINALIZADA', label: 'Finalizada' },
  { value: 'CANCELADA', label: 'Cancelada' },
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

export function PedidosPage() {
  const [pedidos, setPedidos] = useState<VendaListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('all')
  const [origemFiltro, setOrigemFiltro] = useState<OrigemFiltro>('all')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  // Urgency: count of ABERTA orders (all records, not just current page)
  const [abertasTotal, setAbertasTotal] = useState<number | null>(null)

  useEffect(() => {
    api
      .get<VendaPageResponse>('/vendas', { params: { limit: 1, status: 'ABERTA' } })
      .then((r) => setAbertasTotal(r.data.total))
      .catch(() => {/* non-critical */})
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)

    const params: Record<string, unknown> = { page, limit: LIMIT }
    if (statusFiltro !== 'all') params.status = statusFiltro
    if (origemFiltro !== 'all') params.origem = origemFiltro
    if (busca.trim()) params.numero = busca.trim()
    if (dataInicio) params.data_inicio = dataInicio
    if (dataFim) params.data_fim = dataFim

    api
      .get<VendaPageResponse>('/vendas', { params })
      .then((r) => {
        setPedidos(r.data.data)
        setTotal(r.data.total)
      })
      .catch(() => setError('Não foi possível carregar os pedidos. Tente novamente.'))
      .finally(() => setLoading(false))
  }, [page, busca, statusFiltro, origemFiltro, dataInicio, dataFim])

  useEffect(() => {
    load()
  }, [load])

  function handleBuscaChange(value: string) {
    setBusca(value)
    setPage(1)
  }

  function handleStatusToggle(s: VendaStatus) {
    setStatusFiltro((prev) => (prev === s ? 'all' : s))
    setPage(1)
  }

  function handleClear() {
    setBusca('')
    setStatusFiltro('all')
    setOrigemFiltro('all')
    setDataInicio('')
    setDataFim('')
    setPage(1)
  }

  const temFiltro =
    busca !== '' ||
    statusFiltro !== 'all' ||
    origemFiltro !== 'all' ||
    dataInicio !== '' ||
    dataFim !== ''

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading
              ? 'Carregando…'
              : `${total} ${total === 1 ? 'pedido' : 'pedidos'} encontrados`}
          </p>
        </div>
        {abertasTotal !== null && abertasTotal > 0 && (
          <button
            type="button"
            onClick={() => {
              setStatusFiltro('ABERTA')
              setPage(1)
            }}
            className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/8 px-4 py-2.5 text-sm text-primary hover:bg-primary/15 transition-colors"
          >
            <AlertCircle className="h-4 w-4" />
            <span className="font-semibold">{abertasTotal}</span>
            <span>{abertasTotal === 1 ? 'pedido em aberto' : 'pedidos em aberto'}</span>
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por número do pedido"
              value={busca}
              onChange={(e) => handleBuscaChange(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={origemFiltro}
            onValueChange={(v) => { setOrigemFiltro(v as OrigemFiltro); setPage(1) }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas origens</SelectItem>
              <SelectItem value="PDV">PDV</SelectItem>
              <SelectItem value="ECOMMERCE">E-commerce</SelectItem>
              <SelectItem value="PDV_OFFLINE">PDV Offline</SelectItem>
            </SelectContent>
          </Select>

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
              className="text-muted-foreground gap-1"
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground shrink-0">Período:</span>
          <Input
            type="date"
            value={dataInicio}
            onChange={(e) => { setDataInicio(e.target.value); setPage(1) }}
            className="h-8 w-[140px] text-xs"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <Input
            type="date"
            value={dataFim}
            onChange={(e) => { setDataFim(e.target.value); setPage(1) }}
            className="h-8 w-[140px] text-xs"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-8 w-14 rounded bg-muted" />
                <div className="h-8 w-28 rounded bg-muted" />
                <div className="h-8 flex-1 rounded bg-muted" />
                <div className="h-8 w-20 rounded bg-muted" />
                <div className="h-8 w-10 rounded bg-muted" />
                <div className="h-8 w-20 rounded bg-muted" />
                <div className="h-8 w-24 rounded bg-muted" />
                <div className="h-8 w-20 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <PedidosTable
          pedidos={pedidos}
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
