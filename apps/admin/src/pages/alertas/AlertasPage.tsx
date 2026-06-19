import { useCallback, useEffect, useState } from 'react'
import { Bell, History, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import {
  type AlertaEvento,
  type AlertaEventosResponse,
  type AlertaRegra,
  type AlertType,
  ALERT_TYPE_CONFIG,
  formatThreshold,
} from './types'
import { AlertaRuleModal } from './components/AlertaRuleModal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Regras Tab ───────────────────────────────────────────────────────────────

function RegrasTab({
  regras,
  loading,
  togglingId,
  deleteConfirmId,
  onEdit,
  onToggle,
  onDelete,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  regras: AlertaRegra[]
  loading: boolean
  togglingId: string | null
  deleteConfirmId: string | null
  onEdit: (r: AlertaRegra) => void
  onToggle: (r: AlertaRegra) => void
  onDelete: (r: AlertaRegra) => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-9 flex-1 rounded bg-muted" />
              <div className="h-9 w-28 rounded bg-muted" />
              <div className="h-9 w-20 rounded bg-muted" />
              <div className="h-9 w-28 rounded bg-muted" />
              <div className="h-9 w-10 rounded bg-muted" />
              <div className="h-9 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (regras.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm py-20 text-center">
        <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium text-foreground mb-1">Nenhuma regra configurada</p>
        <p className="text-xs text-muted-foreground">
          Crie regras para receber alertas de estoque, margem e outros eventos críticos.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['Nome', 'Tipo', 'Limite', 'Produto', 'Ativo', 'Ações'].map((h) => (
                <th
                  key={h}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-left',
                    h === 'Ativo' && 'text-center',
                    h === 'Ações' && 'text-right',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {regras.map((r) => {
              const tc = ALERT_TYPE_CONFIG[r.type]
              const isToggling = togglingId === r.id
              const isDeleteConfirm = deleteConfirmId === r.id

              return (
                <tr
                  key={r.id}
                  className={cn(
                    'border-b border-border/50 transition-colors hover:bg-muted/10',
                    !r.active && 'opacity-60',
                    isDeleteConfirm && 'bg-destructive/5',
                  )}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground leading-snug">{r.name}</p>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant="outline" className={cn('text-xs', tc.badgeClass)}>
                      {tc.label}
                    </Badge>
                  </td>

                  <td className="px-4 py-3 tabular-nums text-xs text-muted-foreground whitespace-nowrap">
                    {formatThreshold(r.threshold_value, r.threshold_unit)}
                  </td>

                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px]">
                    {r.product ? (
                      <span className="truncate block" title={r.product.name}>
                        {r.product.name}
                      </span>
                    ) : (
                      <span className="italic">Todos os produtos</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => onToggle(r)}
                      aria-label={r.active ? 'Desativar regra' : 'Ativar regra'}
                      className={cn(
                        'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        isToggling ? 'cursor-wait opacity-50' : 'cursor-pointer',
                        r.active ? 'bg-success' : 'bg-muted-foreground/30',
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
                          r.active ? 'translate-x-4' : 'translate-x-0',
                        )}
                      />
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    {isDeleteConfirm ? (
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Confirmar exclusão?</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={onDeleteConfirm}
                        >
                          Excluir
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={onDeleteCancel}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => onEdit(r)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => onDelete(r)}
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Eventos Tab ──────────────────────────────────────────────────────────────

const EVENTOS_LIMIT = 20

function EventosTab({
  eventos,
  total,
  page,
  loading,
  error,
  typeFiltro,
  dataInicio,
  dataFim,
  onTypeChange,
  onDataInicioChange,
  onDataFimChange,
  onPageChange,
}: {
  eventos: AlertaEvento[]
  total: number
  page: number
  loading: boolean
  error: boolean
  typeFiltro: 'all' | AlertType
  dataInicio: string
  dataFim: string
  onTypeChange: (v: 'all' | AlertType) => void
  onDataInicioChange: (v: string) => void
  onDataFimChange: (v: string) => void
  onPageChange: (p: number) => void
}) {
  const totalPages = Math.ceil(total / EVENTOS_LIMIT)
  const temFiltro = typeFiltro !== 'all' || dataInicio !== '' || dataFim !== ''

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={typeFiltro} onValueChange={(v) => onTypeChange(v as 'all' | AlertType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de alerta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {(Object.keys(ALERT_TYPE_CONFIG) as AlertType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {ALERT_TYPE_CONFIG[type].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground shrink-0">Período:</span>
          <Input
            type="date"
            value={dataInicio}
            onChange={(e) => onDataInicioChange(e.target.value)}
            className="h-8 w-[140px] text-xs"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <Input
            type="date"
            value={dataFim}
            onChange={(e) => onDataFimChange(e.target.value)}
            className="h-8 w-[140px] text-xs"
          />

          {temFiltro && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-1"
              onClick={() => {
                onTypeChange('all')
                onDataInicioChange('')
                onDataFimChange('')
              }}
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Não foi possível carregar o histórico de eventos. Tente novamente.
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-8 w-28 rounded bg-muted" />
                <div className="h-8 flex-1 rounded bg-muted" />
                <div className="h-8 w-28 rounded bg-muted" />
                <div className="h-8 w-24 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ) : !error && eventos.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-sm py-20 text-center">
          <History className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground mb-1">
            {temFiltro ? 'Nenhum evento encontrado para este filtro' : 'Nenhum evento registrado ainda'}
          </p>
          <p className="text-xs text-muted-foreground">
            {temFiltro
              ? 'Tente ajustar os filtros ou limpar a busca.'
              : 'Eventos aparecem aqui quando uma regra de alerta é disparada.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Tipo', 'Mensagem', 'Regra', 'Data'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eventos.map((ev) => {
                  const tc = ALERT_TYPE_CONFIG[ev.type]
                  return (
                    <tr
                      key={ev.id}
                      className="border-b border-border/50 transition-colors hover:bg-muted/10"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className={cn('text-xs', tc.badgeClass)}>
                          {tc.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-foreground max-w-xs">
                        <span className="block truncate" title={ev.message}>
                          {ev.message}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[140px]">
                        <span className="block truncate" title={ev.rule.name}>
                          {ev.rule.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(ev.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {total} evento{total !== 1 ? 's' : ''} · página {page} de {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AlertasPage() {
  // Regras
  const [regras, setRegras] = useState<AlertaRegra[]>([])
  const [regrasLoading, setRegrasLoading] = useState(true)
  const [regrasError, setRegrasError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRegra, setEditingRegra] = useState<AlertaRegra | null>(null)

  // Eventos
  const [eventos, setEventos] = useState<AlertaEvento[]>([])
  const [eventosTotal, setEventosTotal] = useState(0)
  const [eventosPage, setEventosPage] = useState(1)
  const [eventosLoading, setEventosLoading] = useState(true)
  const [eventosError, setEventosError] = useState(false)
  const [typeFiltro, setTypeFiltro] = useState<'all' | AlertType>('all')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const loadRegras = useCallback(() => {
    setRegrasLoading(true)
    setRegrasError(null)
    api
      .get<AlertaRegra[]>('/alertas/regras')
      .then((r) => setRegras(r.data))
      .catch(() => setRegrasError('Não foi possível carregar as regras. Tente novamente.'))
      .finally(() => setRegrasLoading(false))
  }, [])

  useEffect(() => {
    loadRegras()
  }, [loadRegras])

  const loadEventos = useCallback(() => {
    setEventosLoading(true)
    setEventosError(false)
    const params: Record<string, unknown> = { page: eventosPage, limit: EVENTOS_LIMIT }
    if (typeFiltro !== 'all') params.type = typeFiltro
    if (dataInicio) params.data_inicio = dataInicio
    if (dataFim) params.data_fim = dataFim

    api
      .get<AlertaEventosResponse>('/alertas/eventos', { params })
      .then((r) => {
        setEventos(r.data.data)
        setEventosTotal(r.data.total)
      })
      .catch(() => setEventosError(true))
      .finally(() => setEventosLoading(false))
  }, [eventosPage, typeFiltro, dataInicio, dataFim])

  useEffect(() => {
    loadEventos()
  }, [loadEventos])

  function handleEdit(r: AlertaRegra) {
    setEditingRegra(r)
    setModalOpen(true)
  }

  function handleCreate() {
    setEditingRegra(null)
    setModalOpen(true)
  }

  function handleModalClose() {
    setModalOpen(false)
    setEditingRegra(null)
  }

  async function handleToggle(r: AlertaRegra) {
    if (togglingId) return
    setTogglingId(r.id)
    setRegras((prev) =>
      prev.map((item) => (item.id === r.id ? { ...item, active: !item.active } : item)),
    )
    try {
      await api.patch(`/alertas/regras/${r.id}`, { active: !r.active })
    } catch {
      setRegras((prev) =>
        prev.map((item) => (item.id === r.id ? { ...item, active: r.active } : item)),
      )
    } finally {
      setTogglingId(null)
    }
  }

  function handleDelete(r: AlertaRegra) {
    setDeleteConfirmId(r.id)
  }

  async function handleDeleteConfirm() {
    const r = regras.find((item) => item.id === deleteConfirmId)
    if (!r) return
    setDeleteConfirmId(null)
    setRegras((prev) => prev.filter((item) => item.id !== r.id))
    try {
      await api.delete(`/alertas/regras/${r.id}`)
    } catch {
      loadRegras()
    }
  }

  const activeCount = regras.filter((r) => r.active).length

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Alertas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {regrasLoading
              ? 'Carregando…'
              : `${regras.length} ${regras.length === 1 ? 'regra' : 'regras'} — ${activeCount} ${activeCount === 1 ? 'ativa' : 'ativas'}`}
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova regra
        </Button>
      </div>

      {regrasError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {regrasError}
        </div>
      )}

      <Tabs defaultValue="regras">
        <TabsList className="mb-4">
          <TabsTrigger value="regras" className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Regras
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="regras">
          <RegrasTab
            regras={regras}
            loading={regrasLoading}
            togglingId={togglingId}
            deleteConfirmId={deleteConfirmId}
            onEdit={handleEdit}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onDeleteConfirm={handleDeleteConfirm}
            onDeleteCancel={() => setDeleteConfirmId(null)}
          />
        </TabsContent>

        <TabsContent value="historico">
          <EventosTab
            eventos={eventos}
            total={eventosTotal}
            page={eventosPage}
            loading={eventosLoading}
            error={eventosError}
            typeFiltro={typeFiltro}
            dataInicio={dataInicio}
            dataFim={dataFim}
            onTypeChange={(v) => { setTypeFiltro(v); setEventosPage(1) }}
            onDataInicioChange={(v) => { setDataInicio(v); setEventosPage(1) }}
            onDataFimChange={(v) => { setDataFim(v); setEventosPage(1) }}
            onPageChange={setEventosPage}
          />
        </TabsContent>
      </Tabs>

      <AlertaRuleModal
        open={modalOpen}
        onClose={handleModalClose}
        regra={editingRegra}
        onSaved={loadRegras}
      />
    </div>
  )
}
