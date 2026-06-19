import { useCallback, useEffect, useState } from 'react'
import { Shield, Plus, MoreHorizontal, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { NovaLgpdModal } from './components/NovaLgpdModal'
import { LgpdDetailSheet } from './components/LgpdDetailSheet'
import {
  type LgpdRequest,
  type LgpdStatus,
  type LgpdTipo,
  type LgpdListResponse,
  STATUS_CONFIG,
  TIPO_CONFIG,
  diasRestantes,
  canProcess,
} from './types'

const LIMIT = 20

function PrazoCell({ req }: { req: LgpdRequest }) {
  if (req.status === 'CONCLUIDA' || req.status === 'REJEITADA') {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  const dias = diasRestantes(req.prazo_legal)
  if (req.prazo_vencido || dias <= 0) {
    return (
      <span className="text-xs font-medium text-destructive">Vencido</span>
    )
  }
  return (
    <span className={cn('text-xs font-medium tabular-nums', dias <= 7 ? 'text-warning' : 'text-success')}>
      {dias}d restante{dias !== 1 ? 's' : ''}
    </span>
  )
}

interface Filtros {
  status: LgpdStatus | 'all'
  tipo: LgpdTipo | 'all'
}

export function LgpdPage() {
  const [requests, setRequests] = useState<LgpdRequest[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [filtros, setFiltros] = useState<Filtros>({ status: 'all', tipo: 'all' })

  const [modalOpen, setModalOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT }
      if (filtros.status !== 'all') params.status = filtros.status
      if (filtros.tipo !== 'all') params.tipo = filtros.tipo
      const r = await api.get<LgpdListResponse>('/lgpd/requests', { params })
      setRequests(r.data.data)
      setTotal(r.data.total)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [page, filtros])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  function handleFiltro(field: keyof Filtros, value: string) {
    setFiltros((prev) => ({ ...prev, [field]: value }))
    setPage(1)
  }

  function clearFiltros() {
    setFiltros({ status: 'all', tipo: 'all' })
    setPage(1)
  }

  const totalPages = Math.ceil(total / LIMIT)
  const hasFiltros = filtros.status !== 'all' || filtros.tipo !== 'all'

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">LGPD</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} solicitação{total !== 1 ? 'ões' : ''}
          </p>
        </div>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Nova solicitação
        </Button>
      </div>

      {/* Filtros */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filtros.status} onValueChange={(v) => handleFiltro('status', v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {(Object.keys(STATUS_CONFIG) as LgpdStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtros.tipo} onValueChange={(v) => handleFiltro('tipo', v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {(Object.keys(TIPO_CONFIG) as LgpdTipo[]).map((t) => (
                <SelectItem key={t} value={t}>{TIPO_CONFIG[t].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFiltros && (
            <Button variant="ghost" size="sm" onClick={clearFiltros} className="text-muted-foreground">
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Não foi possível carregar as solicitações.{' '}
          <button className="underline font-medium" onClick={loadRequests}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Skeleton */}
      {loading && requests.length === 0 ? (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {[140, 120, 100, 80, 80, 32].map((w, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-muted/60 rounded animate-pulse" style={{ width: w }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : requests.length === 0 && !loading ? (
        /* Empty state */
        <div className="rounded-lg border border-border bg-card shadow-sm py-20 text-center">
          <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-display text-lg font-bold text-foreground">
            {hasFiltros ? 'Nenhuma solicitação encontrada' : 'Nenhuma solicitação LGPD'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {hasFiltros
              ? 'Tente ajustar os filtros'
              : 'Solicitações de titulares sobre seus dados pessoais aparecerão aqui'}
          </p>
          {!hasFiltros && (
            <Button className="mt-4 gap-2" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Nova solicitação
            </Button>
          )}
        </div>
      ) : (
        /* Tabela */
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {[
                    { key: 'titular', label: 'Titular' },
                    { key: 'tipo', label: 'Tipo' },
                    { key: 'status', label: 'Status' },
                    { key: 'prazo', label: 'Prazo' },
                    { key: 'solicitado', label: 'Solicitado em' },
                    { key: 'actions', label: '' },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className={cn(
                        'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-left',
                        key === 'actions' && 'w-12',
                        key === 'status' && 'text-center',
                      )}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((req, i) => {
                  const sc = STATUS_CONFIG[req.status]
                  const tc = TIPO_CONFIG[req.tipo]
                  const isOdd = i % 2 === 1
                  const urgent = canProcess(req) && (req.prazo_vencido || diasRestantes(req.prazo_legal) <= 3)

                  return (
                    <tr
                      key={req.id}
                      className={cn(
                        'border-b border-border/50 transition-colors hover:bg-muted/20',
                        isOdd && 'bg-muted/10',
                        urgent && 'bg-destructive/5',
                      )}
                    >
                      {/* Titular */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {req.customer_id.slice(0, 8)}…
                        </span>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn('text-xs font-medium', tc.className)}>
                          {tc.short}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className={cn('text-xs font-medium', sc.className)}>
                          {sc.label}
                        </Badge>
                      </td>

                      {/* Prazo */}
                      <td className="px-4 py-3">
                        <PrazoCell req={req} />
                      </td>

                      {/* Solicitado em */}
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(req.solicitado_em).toLocaleDateString('pt-BR')}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailId(req.id)}>
                              <Eye className="mr-2 h-3.5 w-3.5" />
                              {canProcess(req) ? 'Ver / Processar' : 'Ver detalhes'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {total} solicitação{total !== 1 ? 'ões' : ''}
              {totalPages > 1 && ` · página ${page} de ${totalPages}`}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Próxima
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <NovaLgpdModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={loadRequests}
      />

      <LgpdDetailSheet
        open={!!detailId}
        onClose={() => setDetailId(null)}
        requestId={detailId}
        onProcessed={loadRequests}
      />
    </div>
  )
}
