import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────

interface CostCenter {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
  created_at: string
}

// ── Constants ──────────────────────────────────────────────────────────────

const LIMIT = 20

// ── Component ──────────────────────────────────────────────────────────────

export function CentroCustoPage() {
  const navigate = useNavigate()

  const [centers, setCenters] = useState<CostCenter[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<CostCenter | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ── Load ───────────────────────────────────────────────────────────────

  const loadCenters = useCallback(async () => {
    setLoading(true)
    setListError(null)
    try {
      const { data } = await api.get<{ data: CostCenter[]; total: number }>('/cost-centers', {
        params: { page, limit: LIMIT },
      })
      setCenters(data.data)
      setTotal(data.total)
    } catch {
      setListError('Erro ao carregar centros de custo')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadCenters()
  }, [loadCenters])

  // ── Toggle active ──────────────────────────────────────────────────────

  async function toggleCenter(center: CostCenter) {
    if (togglingId) return
    setTogglingId(center.id)
    setToggleError(null)
    try {
      await api.patch(`/cost-centers/${center.id}`, { ativo: !center.ativo })
      setCenters((prev) =>
        prev.map((c) => (c.id === center.id ? { ...c, ativo: !c.ativo } : c)),
      )
    } catch {
      setToggleError('Erro ao alterar status')
    } finally {
      setTogglingId(null)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.delete(`/cost-centers/${deleteTarget.id}`)
      setCenters((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setTotal((t) => t - 1)
      setDeleteTarget(null)
    } catch {
      setDeleteError('Erro ao excluir centro de custo')
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Centro de Custo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agrupe custos fixos e variáveis para precificação de produtos
          </p>
        </div>
        <Button onClick={() => navigate('/centro-custo/novo')} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo centro
        </Button>
      </div>

      {/* Errors */}
      {(listError ?? toggleError) && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {listError ?? toggleError}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nome
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                Criado em
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <>
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-3">
                      <div className="space-y-1.5">
                        <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-64 rounded bg-muted animate-pulse" />
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="h-5 w-12 rounded-full bg-muted animate-pulse" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="h-4 w-20 rounded bg-muted animate-pulse ml-auto" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <div className="h-8 w-16 rounded bg-muted animate-pulse" />
                        <div className="h-8 w-16 rounded bg-muted animate-pulse" />
                        <div className="h-8 w-8 rounded bg-muted animate-pulse" />
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            )}

            {!loading && centers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-16 text-center">
                  <p className="text-sm font-medium text-foreground">
                    Nenhum centro de custo cadastrado
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crie centros de custo para organizar despesas fixas e variáveis e usar na
                    calculadora de preço.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 gap-2"
                    onClick={() => navigate('/centro-custo/novo')}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Criar primeiro centro
                  </Button>
                </td>
              </tr>
            )}

            {centers.map((center) => (
              <tr
                key={center.id}
                className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{center.nome}</p>
                    {center.descricao && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {center.descricao}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <Badge variant={center.ativo ? 'default' : 'secondary'}>
                    {center.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                  {new Date(center.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/centro-custo/${center.id}/editar`)}
                      className="h-8 gap-1.5 px-2 text-xs"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleCenter(center)}
                      disabled={togglingId === center.id}
                      className={cn(
                        'h-8 px-2 text-xs',
                        center.ativo
                          ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                          : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50',
                      )}
                    >
                      {togglingId === center.id ? '...' : center.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTarget(center)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {total} centro{total !== 1 ? 's' : ''} · página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
            setDeleteError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir centro de custo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{' '}
              <span className="font-medium text-foreground">"{deleteTarget?.nome}"</span>? Esta ação
              não pode ser desfeita e todos os itens de custo vinculados serão removidos.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null)
                setDeleteError(null)
              }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir centro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
