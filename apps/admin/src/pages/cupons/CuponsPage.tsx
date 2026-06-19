import { useCallback, useEffect, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
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
import { CuponsTable } from './components/CuponsTable'
import { NovoCupomModal } from './components/NovoCupomModal'
import {
  type Cupom,
  type CuponsResponse,
  type CouponType,
  type CupomStatus,
  getCupomStatus,
} from './types'

const LIMIT = 20

type TipoFiltro = 'all' | CouponType

interface Filtros {
  busca: string
  tipo: TipoFiltro
  status: CupomStatus | 'all'
}

const FILTROS_INIT: Filtros = { busca: '', tipo: 'all', status: 'all' }

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
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

export function CuponsPage() {
  const [cupons, setCupons] = useState<Cupom[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INIT)
  const [modalOpen, setModalOpen] = useState(false)
  const [editCupom, setEditCupom] = useState<Cupom | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadCupons = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params: Record<string, string | number | boolean> = { page, limit: LIMIT }
      if (filtros.tipo !== 'all') params.type = filtros.tipo
      if (filtros.status === 'ativo') params.active = true
      if (filtros.status === 'inativo') params.active = false
      const r = await api.get<CuponsResponse>('/cupons', { params })
      let data = r.data.data
      if (filtros.busca) {
        const q = filtros.busca.toLowerCase()
        data = data.filter(
          (c) => c.code.toLowerCase().includes(q) || (c.description?.toLowerCase().includes(q) ?? false),
        )
      }
      if (filtros.status === 'ativo' || filtros.status === 'expirado' || filtros.status === 'esgotado') {
        data = data.filter((c) => getCupomStatus(c) === filtros.status)
      }
      setCupons(data)
      // derived statuses (expirado/esgotado) are filtered client-side; use filtered count to keep pagination accurate
      setTotal(
        filtros.status === 'expirado' || filtros.status === 'esgotado' ? data.length : r.data.total,
      )
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [page, filtros])

  useEffect(() => {
    loadCupons()
  }, [loadCupons])

  async function handleToggle(cupom: Cupom) {
    if (togglingId) return
    setTogglingId(cupom.id)
    setCupons((prev) => prev.map((c) => c.id === cupom.id ? { ...c, active: !c.active } : c))
    try {
      await api.patch(`/cupons/${cupom.id}`, { active: !cupom.active })
    } catch {
      setCupons((prev) => prev.map((c) => c.id === cupom.id ? { ...c, active: cupom.active } : c))
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDeleteConfirm(id: string) {
    setDeleteConfirmId(null)
    try {
      await api.delete(`/cupons/${id}`)
      setCupons((prev) => prev.filter((c) => c.id !== id))
      setTotal((prev) => Math.max(0, prev - 1))
    } catch {
      await loadCupons()
    }
  }

  function handleFiltroChange(patch: Partial<Filtros>) {
    setFiltros((prev) => ({ ...prev, ...patch }))
    setPage(1)
    setDeleteConfirmId(null)
  }

  function handleModalClose() {
    setModalOpen(false)
    setEditCupom(null)
  }

  const temFiltro = filtros.busca || filtros.tipo !== 'all' || filtros.status !== 'all'

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Cupons</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} cupons cadastrados</p>
        </div>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Novo cupom
        </Button>
      </div>

      {/* Filtros */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou descrição"
              value={filtros.busca}
              onChange={(e) => handleFiltroChange({ busca: e.target.value })}
              className="pl-9"
            />
          </div>

          <Select
            value={filtros.tipo}
            onValueChange={(v) => handleFiltroChange({ tipo: v as TipoFiltro })}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="PERCENTUAL">Percentual</SelectItem>
              <SelectItem value="FIXO">Valor fixo</SelectItem>
              <SelectItem value="FRETE_GRATIS">Frete grátis</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            {(['ativo', 'inativo', 'expirado', 'esgotado'] as const).map((s) => (
              <ToggleChip
                key={s}
                label={s.charAt(0).toUpperCase() + s.slice(1)}
                active={filtros.status === s}
                onClick={() => handleFiltroChange({ status: filtros.status === s ? 'all' : s })}
              />
            ))}
          </div>

          {temFiltro && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFiltros(FILTROS_INIT); setPage(1) }}
              className="text-muted-foreground"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Não foi possível carregar os cupons.{' '}
          <button className="underline font-medium" onClick={loadCupons}>
            Tentar novamente
          </button>
        </div>
      )}

      {loading && cupons.length === 0 ? (
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {[120, 80, 80, 120, 60, 70, 32].map((w, j) => (
                    <td key={j} className="px-4 py-4">
                      <div
                        className="h-4 bg-muted/60 rounded animate-pulse"
                        style={{ width: w }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <CuponsTable
          cupons={cupons}
          page={page}
          limit={LIMIT}
          total={total}
          onPageChange={(p) => { setPage(p); setDeleteConfirmId(null) }}
          onToggle={handleToggle}
          onEdit={(c) => { setEditCupom(c); setModalOpen(true) }}
          onDeleteClick={(id) => setDeleteConfirmId(id)}
          onDeleteConfirm={handleDeleteConfirm}
          onDeleteCancel={() => setDeleteConfirmId(null)}
          deleteConfirmId={deleteConfirmId}
          togglingId={togglingId}
        />
      )}

      <NovoCupomModal
        open={modalOpen}
        onClose={handleModalClose}
        cupom={editCupom}
        onSaved={loadCupons}
      />
    </div>
  )
}
